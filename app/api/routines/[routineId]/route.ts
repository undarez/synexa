import { NextRequest, NextResponse } from "next/server";
import { RoutineActionType, RoutineTriggerType } from "@/app/lib/supabase/types";
import { supabase } from "@/app/lib/supabase/client";
import { requireUser, UnauthorizedError } from "@/app/lib/auth/mock";
import { generateId } from "@/app/lib/supabase/helpers";

type RoutineStepInput = {
  actionType: RoutineActionType;
  payload?: Record<string, unknown> | null;
  deviceId?: string | null;
  delaySeconds?: number | null;
  order?: number;
};

type RoutinePayload = {
  name?: string;
  description?: string | null;
  active?: boolean;
  triggerType?: RoutineTriggerType;
  triggerData?: Record<string, unknown> | null;
  steps?: RoutineStepInput[];
};

function normalizeSteps(steps: RoutineStepInput[] = []) {
  return steps
    .filter((step) => !!step.actionType)
    .map((step, index) => ({
      actionType: step.actionType,
      payload: step.payload ?? null,
      deviceId: step.deviceId ?? null,
      delaySeconds: step.delaySeconds ?? null,
      order: step.order ?? index,
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((step, index) => ({ ...step, order: index }));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ routineId: string }> }
) {
  try {
    const user = await requireUser();
    const { routineId } = await params;
    const body = (await request.json()) as RoutinePayload;

    // Récupérer la routine avec ses steps
    const { data: routine, error: fetchError } = await supabase
      .from('Routine')
      .select(`
        *,
        steps:RoutineStep(*)
      `)
      .eq('id', routineId)
      .eq('userId', user.id)
      .single();

    if (fetchError || !routine) {
      return NextResponse.json({ error: "Routine introuvable" }, { status: 404 });
    }

    // Construire l'objet de mise à jour
    const updateData: {
      name?: string;
      description?: string | null;
      active?: boolean;
      triggerType?: RoutineTriggerType;
      triggerData?: any;
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.triggerType !== undefined) updateData.triggerType = body.triggerType;
    if (body.triggerData !== undefined) updateData.triggerData = body.triggerData;

    // Mettre à jour la routine
    const { error: updateError } = await supabase
      .from('Routine')
      // @ts-expect-error - Le type Database.Update est any, mais TypeScript ne l'infère pas correctement
      .update(updateData)
      .eq('id', routine.id)
      .eq('userId', user.id);

    if (updateError) {
      console.error('[PATCH /routines/:id] Erreur mise à jour routine:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la routine', details: updateError.message },
        { status: 500 }
      );
    }

    // Gérer les steps si fournis
    if (body.steps) {
      const steps = normalizeSteps(body.steps);
      
      // Supprimer les anciens steps
      const { error: deleteError } = await supabase
        .from('RoutineStep')
        .delete()
        .eq('routineId', routine.id);

      if (deleteError) {
        console.error('[PATCH /routines/:id] Erreur suppression steps:', deleteError);
      }

      // Créer les nouveaux steps
      if (steps.length > 0) {
        const { error: createStepsError } = await supabase
          .from('RoutineStep')
          .insert(
            steps.map((step) => ({
              id: generateId(),
              routineId: routine.id,
              order: step.order ?? 0,
              actionType: step.actionType,
              payload: step.payload ?? null,
              deviceId: step.deviceId ?? null,
              delaySeconds: step.delaySeconds ?? null,
            }))
          );

        if (createStepsError) {
          console.error('[PATCH /routines/:id] Erreur création steps:', createStepsError);
          return NextResponse.json(
            { error: 'Erreur lors de la mise à jour des étapes', details: createStepsError.message },
            { status: 500 }
          );
        }
      }
    }

    // Récupérer la routine complète mise à jour
    const { data: updated, error: fetchUpdatedError } = await supabase
      .from('Routine')
      .select(`
        *,
        steps:RoutineStep(*),
        logs:RoutineLog(*)
      `)
      .eq('id', routine.id)
      .single();

    if (fetchUpdatedError || !updated) {
      console.error('[PATCH /routines/:id] Erreur récupération routine mise à jour:', fetchUpdatedError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la routine mise à jour' },
        { status: 500 }
      );
    }

    // Trier les steps
    const sortedRoutine = {
      ...updated,
      steps: (updated.steps || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
    };

    return NextResponse.json({ routine: sortedRoutine });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[PATCH /routines/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ routineId: string }> }
) {
  try {
    const user = await requireUser();
    const { routineId } = await params;
    // Vérifier que la routine existe
    const { data: routine, error: fetchError } = await supabase
      .from('Routine')
      .select('id')
      .eq('id', routineId)
      .eq('userId', user.id)
      .single();

    if (fetchError || !routine) {
      return NextResponse.json({ error: "Routine introuvable" }, { status: 404 });
    }

    // Supprimer la routine (les steps seront supprimés automatiquement via CASCADE si configuré)
    const { error: deleteError } = await supabase
      .from('Routine')
      .delete()
      .eq('id', routine.id)
      .eq('userId', user.id);

    if (deleteError) {
      console.error('[DELETE /routines/:id] Erreur Supabase:', deleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la routine', details: deleteError.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[DELETE /routines/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}


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

function normalizeSteps(steps: RoutineStepInput[] = []): RoutineStepInput[] {
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

export async function GET() {
  try {
    const user = await requireUser();
    
    // Récupérer les routines avec leurs steps et logs
    const { data: routines, error } = await supabase
      .from('Routine')
      .select(`
        *,
        steps:RoutineStep(*),
        logs:RoutineLog(*)
      `)
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('[GET /routines] Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des routines', details: error.message },
        { status: 500 }
      );
    }

    // Trier les steps et logs manuellement (Supabase ne supporte pas le tri imbriqué)
    const routinesWithSortedRelations = (routines || []).map((routine: any) => ({
      ...routine,
      steps: (routine.steps || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
      logs: (routine.logs || [])
        .sort((a: any, b: any) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
        .slice(0, 5),
    }));

    return NextResponse.json({ routines: routinesWithSortedRelations });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[GET /routines]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as RoutinePayload;

    if (!body.name) {
      return NextResponse.json(
        { error: "Le champ 'name' est requis" },
        { status: 400 }
      );
    }

    const steps = normalizeSteps(body.steps ?? []);

    const now = new Date().toISOString();
    const routineId = generateId();
    
    // Créer la routine
    const { data: routine, error: routineError } = await supabase
      .from('Routine')
      .insert({
        id: routineId,
        userId: user.id,
        name: body.name,
        description: body.description ?? null,
        active: body.active ?? true,
        triggerType: body.triggerType ?? RoutineTriggerType.MANUAL,
        triggerData: body.triggerData ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (routineError || !routine) {
      console.error('[POST /routines] Erreur création routine:', routineError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la routine', details: routineError?.message },
        { status: 500 }
      );
    }

    // Créer les steps associés
    if (steps.length > 0) {
      const { error: stepsError } = await supabase
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

      if (stepsError) {
        console.error('[POST /routines] Erreur création steps:', stepsError);
        // Supprimer la routine si les steps échouent
        await supabase.from('Routine').delete().eq('id', routine.id);
        return NextResponse.json(
          { error: 'Erreur lors de la création des étapes', details: stepsError.message },
          { status: 500 }
        );
      }
    }

    // Récupérer la routine complète avec ses relations
    const { data: completeRoutine, error: fetchError } = await supabase
      .from('Routine')
      .select(`
        *,
        steps:RoutineStep(*),
        logs:RoutineLog(*)
      `)
      .eq('id', routine.id)
      .single();

    if (fetchError || !completeRoutine) {
      // Retourner quand même la routine de base si la récupération échoue
      return NextResponse.json({ routine: { ...routine, steps: [], logs: [] } }, { status: 201 });
    }

    // Trier les steps
    const sortedRoutine = {
      ...completeRoutine,
      steps: (completeRoutine.steps || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
    };

    return NextResponse.json({ routine: sortedRoutine }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[POST /routines]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 400 }
    );
  }
}


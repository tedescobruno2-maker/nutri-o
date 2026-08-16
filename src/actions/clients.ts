"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { KanbanStatus } from "@/generated/prisma/enums";
import { z } from "zod";

const moveClientSchema = z.object({
  clientId: z.string().min(1),
  status: z.enum(KanbanStatus),
  orderedIdsInStatus: z.array(z.string()),
});

export async function moveClient(input: z.infer<typeof moveClientSchema>) {
  const { clientId, status, orderedIdsInStatus } = moveClientSchema.parse(input);

  await prisma.$transaction([
    prisma.client.update({ where: { id: clientId }, data: { status } }),
    ...orderedIdsInStatus.map((id, index) =>
      prisma.client.update({ where: { id }, data: { order: index } })
    ),
  ]);

  revalidatePath("/clients");
  revalidatePath("/");
}

const createClientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  birthDate: z.coerce.date().optional(),
  height: z.coerce.number().positive().optional(),
  goal: z.string().optional(),
  notes: z.string().optional(),
});

export async function createClient(formData: FormData) {
  const parsed = createClientSchema.parse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    height: formData.get("height") || undefined,
    goal: formData.get("goal") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const count = await prisma.client.count({ where: { status: "NOVOS" } });

  await prisma.client.create({
    data: {
      ...parsed,
      email: parsed.email || undefined,
      status: "NOVOS",
      order: count,
    },
  });

  revalidatePath("/clients");
  revalidatePath("/");
}

const updateClientSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  age: z.coerce.number().int().positive().optional(),
  birthDate: z.coerce.date().optional(),
  height: z.coerce.number().positive().optional(),
  goal: z.string().optional(),
  document: z.string().optional(),
  profession: z.string().optional(),
  notes: z.string().optional(),
});

export async function updateClient(formData: FormData) {
  const parsed = updateClientSchema.parse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    age: formData.get("age") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    height: formData.get("height") || undefined,
    goal: formData.get("goal") || undefined,
    document: formData.get("document") || undefined,
    profession: formData.get("profession") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const { clientId, ...data } = parsed;

  await prisma.client.update({
    where: { id: clientId },
    data: { ...data, email: data.email || null },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function deleteClient(clientId: string) {
  await prisma.client.delete({ where: { id: clientId } });
  revalidatePath("/clients");
  revalidatePath("/");
}

const addMeasurementSchema = z.object({
  clientId: z.string().min(1),
  weight: z.coerce.number().positive(),
  bodyFat: z.coerce.number().positive().optional(),
  waist: z.coerce.number().positive().optional(),
  hip: z.coerce.number().positive().optional(),
});

export async function addMeasurement(formData: FormData) {
  const parsed = addMeasurementSchema.parse({
    clientId: formData.get("clientId"),
    weight: formData.get("weight"),
    bodyFat: formData.get("bodyFat") || undefined,
    waist: formData.get("waist") || undefined,
    hip: formData.get("hip") || undefined,
  });

  await prisma.measurement.create({ data: parsed });
  revalidatePath(`/clients/${parsed.clientId}`);
}

const addDietLogSchema = z.object({
  clientId: z.string().min(1),
  weekStart: z.coerce.date(),
  adherence: z.coerce.number().min(0).max(100),
  protein: z.coerce.number().positive().optional(),
  carbs: z.coerce.number().positive().optional(),
  fat: z.coerce.number().positive().optional(),
});

export async function addDietLog(formData: FormData) {
  const parsed = addDietLogSchema.parse({
    clientId: formData.get("clientId"),
    weekStart: formData.get("weekStart"),
    adherence: formData.get("adherence"),
    protein: formData.get("protein") || undefined,
    carbs: formData.get("carbs") || undefined,
    fat: formData.get("fat") || undefined,
  });

  await prisma.dietLog.create({ data: parsed });
  revalidatePath(`/clients/${parsed.clientId}`);
}

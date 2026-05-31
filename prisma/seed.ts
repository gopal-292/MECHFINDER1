import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(opts: {
  email: string;
  name: string;
  password: string;
  role: Role;
  phone?: string;
}) {
  const passwordHash = await bcrypt.hash(opts.password, 10);
  return prisma.user.upsert({
    where: { email: opts.email },
    update: { name: opts.name, role: opts.role, passwordHash, phone: opts.phone },
    create: {
      email: opts.email,
      name: opts.name,
      passwordHash,
      role: opts.role,
      phone: opts.phone,
    },
  });
}

async function main() {
  console.log("Seeding demo accounts…");

  await upsertUser({
    email: "admin@webmech.com",
    name: "WebMech Admin",
    password: "admin123",
    role: "ADMIN",
  });

  await upsertUser({
    email: "user@demo.com",
    name: "Demo Driver",
    password: "demo123",
    role: "USER",
    phone: "+91-9000000001",
  });

  const mech = await upsertUser({
    email: "mech@demo.com",
    name: "Approved Mechanic",
    password: "demo123",
    role: "MECHANIC",
    phone: "+91-9000000002",
  });
  await prisma.mechanic.upsert({
    where: { userId: mech.id },
    update: { isApproved: true, isAvailable: true },
    create: {
      userId: mech.id,
      bio: "10 years experience. Two-wheelers and small cars.",
      specializations: "Battery, Tyres, Electrical",
      vehicleTypes: "Bike, Car",
      lat: 12.9716,
      lng: 77.5946,
      serviceRadiusKm: 15,
      isApproved: true,
      isAvailable: true,
    },
  });

  const pending = await upsertUser({
    email: "pendingmech@demo.com",
    name: "Pending Mechanic",
    password: "demo123",
    role: "MECHANIC",
    phone: "+91-9000000003",
  });
  await prisma.mechanic.upsert({
    where: { userId: pending.id },
    update: { isApproved: false },
    create: {
      userId: pending.id,
      bio: "New mechanic awaiting approval.",
      specializations: "General",
      vehicleTypes: "Car",
      serviceRadiusKm: 10,
      isApproved: false,
    },
  });

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

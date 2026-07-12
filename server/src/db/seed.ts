import { PrismaClient, ActivityType, TransactionSource } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash("Passw0rd!", 10);

  const engineering = await prisma.department.create({
    data: { name: "Engineering", code: "ENG", status: "active" },
  });
  const platform = await prisma.department.create({
    data: { name: "Platform Engineering", code: "ENG-PLAT", parentDepartmentId: engineering.id, status: "active" },
  });
  const operations = await prisma.department.create({
    data: { name: "Operations", code: "OPS", status: "active" },
  });
  const sales = await prisma.department.create({
    data: { name: "Sales", code: "SALES", status: "active" },
  });
  const hr = await prisma.department.create({
    data: { name: "People & Culture", code: "HR", status: "active" },
  });

  const departments = [engineering, platform, operations, sales, hr];

  const admin = await prisma.user.create({
    data: { name: "Asha Rao", email: "admin@ecosphere.dev", passwordHash, role: "admin", departmentId: hr.id },
  });

  const managers = await Promise.all(
    departments.map((dept, i) =>
      prisma.user.create({
        data: {
          name: `Manager ${i + 1}`,
          email: `manager${i + 1}@ecosphere.dev`,
          passwordHash,
          role: "manager",
          departmentId: dept.id,
        },
      })
    )
  );

  await Promise.all(
    departments.map((dept, i) =>
      prisma.department.update({ where: { id: dept.id }, data: { headUserId: managers[i].id } })
    )
  );

  const employeeNames = [
    "Meera Nair", "Rohan Iyer", "Divya Menon", "Karan Shah", "Priya Verma",
    "Arjun Kapoor", "Sneha Reddy", "Vikram Singh", "Ananya Gupta", "Tanvi Desai",
    "Rahul Malhotra", "Isha Bhatt", "Yash Trivedi", "Neha Joshi",
  ];
  const employees = await Promise.all(
    employeeNames.map((name, i) =>
      prisma.user.create({
        data: {
          name,
          email: `${name.toLowerCase().replace(" ", ".")}@ecosphere.dev`,
          passwordHash,
          role: "employee",
          departmentId: departments[i % departments.length].id,
        },
      })
    )
  );

  const csrCategory = await prisma.category.create({ data: { name: "Community Service", type: "csr_activity" } });
  const envCategory = await prisma.category.create({ data: { name: "Environmental Action", type: "csr_activity" } });
  const fitnessChallenge = await prisma.category.create({ data: { name: "Wellness", type: "challenge" } });
  const sustainabilityChallenge = await prisma.category.create({ data: { name: "Sustainability", type: "challenge" } });

  const factors = await Promise.all([
    prisma.emissionFactor.create({ data: { name: "Grid electricity (India)", activityType: ActivityType.manufacturing, unit: "kWh", co2ePerUnit: 0.708, effectiveFrom: monthsAgo(24) } }),
    prisma.emissionFactor.create({ data: { name: "Diesel fleet fuel", activityType: ActivityType.fleet, unit: "litre", co2ePerUnit: 2.68, effectiveFrom: monthsAgo(24) } }),
    prisma.emissionFactor.create({ data: { name: "Office paper purchase", activityType: ActivityType.purchase, unit: "kg", co2ePerUnit: 0.94, effectiveFrom: monthsAgo(24) } }),
    prisma.emissionFactor.create({ data: { name: "Air travel (domestic)", activityType: ActivityType.expense, unit: "km", co2ePerUnit: 0.15, effectiveFrom: monthsAgo(24) } }),
    prisma.emissionFactor.create({ data: { name: "Cloud compute (hosted)", activityType: ActivityType.manufacturing, unit: "vCPU-hr", co2ePerUnit: 0.03, effectiveFrom: monthsAgo(24) } }),
    prisma.emissionFactor.create({ data: { name: "Packaging cardboard", activityType: ActivityType.manufacturing, unit: "kg", co2ePerUnit: 1.1, effectiveFrom: monthsAgo(24) } }),
    prisma.emissionFactor.create({ data: { name: "Employee commute (car)", activityType: ActivityType.fleet, unit: "km", co2ePerUnit: 0.192, effectiveFrom: monthsAgo(24) } }),
    prisma.emissionFactor.create({ data: { name: "Water usage", activityType: ActivityType.expense, unit: "kL", co2ePerUnit: 0.344, effectiveFrom: monthsAgo(24) } }),
  ]);

  await prisma.productEsgProfile.createMany({
    data: [
      { productName: "EcoBox Packaging", sku: "PKG-001", emissionFactorId: factors[5].id, recyclable: true, esgRating: "A" },
      { productName: "Standard Server Rack", sku: "SRV-014", emissionFactorId: factors[4].id, recyclable: false, esgRating: "B" },
      { productName: "Recycled Paper Ream", sku: "PPR-220", emissionFactorId: factors[2].id, recyclable: true, esgRating: "A" },
    ],
  });

  for (const dept of departments) {
    await prisma.environmentalGoal.create({
      data: {
        name: `${dept.name} carbon reduction FY26`,
        departmentId: dept.id,
        targetCo2: 5000,
        currentCo2: 2000 + Math.random() * 3500,
        deadline: daysFromNow(180),
        status: "active",
      },
    });
  }

  const operationTypes = [ActivityType.purchase, ActivityType.manufacturing, ActivityType.expense, ActivityType.fleet];
  let opRefCounter = 1000;
  for (let m = 11; m >= 0; m--) {
    const occurredAt = monthsAgo(m);
    const opsThisMonth = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < opsThisMonth; i++) {
      const dept = departments[Math.floor(Math.random() * departments.length)];
      const type = operationTypes[Math.floor(Math.random() * operationTypes.length)];
      const factor = factors[Math.floor(Math.random() * factors.length)];
      const quantity = 50 + Math.random() * 950;
      const op = await prisma.erpOperation.create({
        data: {
          type,
          referenceNo: `ERP-${opRefCounter++}`,
          departmentId: dept.id,
          emissionFactorId: factor.id,
          quantity,
          unit: factor.unit,
          occurredAt,
        },
      });
      await prisma.carbonTransaction.create({
        data: {
          erpOperationId: op.id,
          emissionFactorId: factor.id,
          departmentId: dept.id,
          quantity,
          co2e: Number(quantity) * Number(factor.co2ePerUnit),
          source: TransactionSource.auto,
        },
      });
    }
  }

  const csrActivities = await Promise.all([
    prisma.csrActivity.create({ data: { title: "Beach Cleanup Drive", categoryId: envCategory.id, description: "Coastal cleanup with local NGO partners.", eventDate: daysFromNow(14), location: "Marina Beach", evidenceRequired: true, points: 50, status: "open", createdBy: admin.id } }),
    prisma.csrActivity.create({ data: { title: "Tree Plantation", categoryId: envCategory.id, description: "Plant saplings around the campus.", eventDate: daysFromNow(30), location: "Campus Grounds", evidenceRequired: true, points: 40, status: "open", createdBy: admin.id } }),
    prisma.csrActivity.create({ data: { title: "Blood Donation Camp", categoryId: csrCategory.id, description: "Partner with Red Cross for donation drive.", eventDate: daysFromNow(-10), location: "Auditorium", evidenceRequired: false, points: 30, status: "closed", createdBy: admin.id } }),
    prisma.csrActivity.create({ data: { title: "Skill Mentoring for Youth", categoryId: csrCategory.id, description: "Mentor underprivileged students in basic coding.", eventDate: daysFromNow(20), location: "Community Center", evidenceRequired: false, points: 35, status: "open", createdBy: admin.id } }),
  ]);

  const approvalStates = ["approved", "pending", "rejected"] as const;
  for (let i = 0; i < employees.length; i++) {
    const activity = csrActivities[i % csrActivities.length];
    const status = approvalStates[i % approvalStates.length];
    try {
      await prisma.employeeParticipation.create({
        data: {
          userId: employees[i].id,
          csrActivityId: activity.id,
          approvalStatus: status,
          pointsEarned: status === "approved" ? activity.points : 0,
          proofFilePath: activity.evidenceRequired && status !== "pending" ? `/uploads/proofs/demo-${i}.jpg` : null,
          completionDate: status === "approved" ? monthsAgo(1) : null,
          reviewedBy: status !== "pending" ? managers[i % managers.length].id : null,
        },
      });
    } catch {
      // unique constraint collisions across the demo loop are fine to skip
    }
  }

  for (const dept of departments) {
    await prisma.diversityMetric.create({
      data: {
        departmentId: dept.id,
        period: "2026-06",
        genderRatio: { male: 55, female: 42, other: 3 },
        trainingCompletionPct: 60 + Math.random() * 35,
      },
    });
  }

  const policies = await Promise.all([
    prisma.esgPolicy.create({ data: { title: "Code of Conduct", version: "v3", effectiveDate: monthsAgo(6), status: "active" } }),
    prisma.esgPolicy.create({ data: { title: "Environmental Policy", version: "v2", effectiveDate: monthsAgo(3), status: "active" } }),
    prisma.esgPolicy.create({ data: { title: "Anti-Harassment Policy", version: "v1", effectiveDate: monthsAgo(12), status: "active" } }),
  ]);

  for (const user of [...managers, ...employees]) {
    for (const policy of policies) {
      if (Math.random() > 0.25) {
        await prisma.policyAcknowledgement.create({ data: { policyId: policy.id, userId: user.id } });
      }
    }
  }

  const audit1 = await prisma.audit.create({
    data: { title: "Q1 Governance Audit", departmentId: engineering.id, auditorName: "External Auditor Co.", auditDate: monthsAgo(3), findingsSummary: "Two moderate findings on access control.", status: "completed" },
  });
  const audit2 = await prisma.audit.create({
    data: { title: "Q2 Compliance Review", departmentId: operations.id, auditorName: "Internal Audit Team", auditDate: monthsAgo(1), findingsSummary: "Ongoing review of vendor contracts.", status: "in_progress" },
  });

  await prisma.complianceIssue.create({
    data: { auditId: audit1.id, description: "Excess admin privileges on deployment pipeline.", severity: "high", departmentId: engineering.id, ownerUserId: managers[0].id, dueDate: monthsAgo(1), status: "resolved", resolvedAt: monthsAgo(1) },
  });
  await prisma.complianceIssue.create({
    data: { auditId: audit2.id, description: "Vendor contract missing data-processing addendum.", severity: "medium", departmentId: operations.id, ownerUserId: managers[2].id, dueDate: daysFromNow(-5), status: "open", isOverdue: true },
  });
  await prisma.complianceIssue.create({
    data: { auditId: audit2.id, description: "Incomplete audit trail for procurement approvals.", severity: "low", departmentId: operations.id, ownerUserId: managers[2].id, dueDate: daysFromNow(15), status: "in_progress" },
  });

  const challenges = await Promise.all([
    prisma.challenge.create({ data: { title: "10K Steps a Day", categoryId: fitnessChallenge.id, description: "Log 10,000 steps daily for two weeks.", xp: 100, difficulty: "easy", evidenceRequired: false, deadline: daysFromNow(14), status: "active" } }),
    prisma.challenge.create({ data: { title: "Zero-Waste Week", categoryId: sustainabilityChallenge.id, description: "Produce no landfill waste for a full week.", xp: 200, difficulty: "hard", evidenceRequired: true, deadline: daysFromNow(21), status: "active" } }),
    prisma.challenge.create({ data: { title: "Carpool Champion", categoryId: sustainabilityChallenge.id, description: "Carpool to work at least 3 days this month.", xp: 150, difficulty: "medium", evidenceRequired: true, deadline: daysFromNow(-2), status: "under_review" } }),
    prisma.challenge.create({ data: { title: "Draft: Plastic-Free Desk", categoryId: sustainabilityChallenge.id, description: "Remove single-use plastics from your desk setup.", xp: 80, difficulty: "easy", evidenceRequired: false, deadline: daysFromNow(45), status: "draft" } }),
    prisma.challenge.create({ data: { title: "Meditation Streak", categoryId: fitnessChallenge.id, description: "10 minutes of meditation, 30 days straight.", xp: 120, difficulty: "medium", evidenceRequired: false, deadline: monthsAgo(-2), status: "completed" } }),
  ]);

  for (let i = 0; i < employees.length; i++) {
    const challenge = challenges[i % 3];
    try {
      await prisma.challengeParticipation.create({
        data: {
          challengeId: challenge.id,
          userId: employees[i].id,
          progressPct: Math.min(100, Math.random() * 120),
          approvalStatus: i % 3 === 0 ? "approved" : "pending",
          xpAwarded: i % 3 === 0 ? challenge.xp : 0,
        },
      });
    } catch {
      // skip unique-constraint collisions in the demo loop
    }
  }

  const badges = await Promise.all([
    prisma.badge.create({ data: { name: "First Steps", description: "Earn your first 50 XP.", icon: "sparkles", unlockRule: { metric: "xp", op: ">=", value: 50 } } }),
    prisma.badge.create({ data: { name: "Green Champion", description: "Complete 3 sustainability challenges.", icon: "leaf", unlockRule: { metric: "completed_challenges", op: ">=", value: 3 } } }),
    prisma.badge.create({ data: { name: "Century Club", description: "Reach 500 XP.", icon: "trophy", unlockRule: { metric: "xp", op: ">=", value: 500 } } }),
    prisma.badge.create({ data: { name: "Community Pillar", description: "Participate in 5 CSR activities.", icon: "handshake", unlockRule: { metric: "csr_participations", op: ">=", value: 5 } } }),
  ]);

  for (let i = 0; i < employees.length; i += 2) {
    await prisma.userBadge.create({ data: { userId: employees[i].id, badgeId: badges[i % badges.length].id } });
  }

  await prisma.reward.createMany({
    data: [
      { name: "Extra Day Off", description: "Redeem for one additional paid day off.", pointsRequired: 500, stock: 10 },
      { name: "EcoSphere Water Bottle", description: "Insulated stainless steel bottle.", pointsRequired: 100, stock: 40 },
      { name: "Lunch with the CEO", description: "One-on-one lunch slot.", pointsRequired: 300, stock: 3 },
      { name: "Work-From-Home Voucher", description: "One free WFH day, no approval needed.", pointsRequired: 150, stock: 25 },
      { name: "Charity Donation Match", description: "Company matches your ₹1000 charity donation.", pointsRequired: 200, stock: 15 },
    ],
  });

  await prisma.esgConfig.create({
    data: { autoEmissionCalc: true, evidenceRequiredGlobal: true, badgeAutoAward: true, emailAlerts: false, weightEnv: 0.4, weightSocial: 0.3, weightGov: 0.3 },
  });

  for (let m = 11; m >= 0; m--) {
    const period = monthsAgo(m).toISOString().slice(0, 7);
    for (const dept of departments) {
      const env = 55 + Math.random() * 40;
      const soc = 50 + Math.random() * 45;
      const gov = 60 + Math.random() * 35;
      await prisma.departmentScore.create({
        data: {
          departmentId: dept.id,
          period,
          environmentalScore: env,
          socialScore: soc,
          governanceScore: gov,
          totalScore: env * 0.4 + soc * 0.3 + gov * 0.3,
        },
      });
    }
  }

  await prisma.notification.create({
    data: { userId: managers[2].id, type: "issue_overdue", title: "Compliance issue overdue", body: "Vendor contract addendum issue is past its due date.", isRead: false },
  });
  await prisma.notification.create({
    data: { userId: employees[0].id, type: "badge_unlock", title: "Badge unlocked: First Steps", body: "You earned the First Steps badge.", isRead: false },
  });

  console.log("Seed complete:", {
    departments: departments.length,
    users: 1 + managers.length + employees.length,
    emissionFactors: factors.length,
    csrActivities: csrActivities.length,
    challenges: challenges.length,
    badges: badges.length,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

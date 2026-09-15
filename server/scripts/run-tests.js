const { execSync } = require("child_process");

const testFiles = [
    "src/tests/integration/health.test.ts",
    "src/tests/integration/auth.test.ts",
    "src/tests/integration/project.test.ts",
    "src/tests/integration/project.member.test.ts",
    "src/tests/integration/task.test.ts",
    "src/tests/integration/invitation.test.ts",
    "src/tests/integration/comment.task.test.ts",
    "src/tests/integration/project.link.test.ts",
    "src/tests/integration/task.swap.request.test.ts",
    "src/tests/integration/submission.test.ts",
    "src/tests/integration/submission.attachment.test.ts",
    "src/tests/integration/uploadRateLimiter.test.ts",
    "src/tests/integration/download.test.ts",
    "src/tests/integration/notification_v1.test.ts",
    "src/tests/integration/notification_v2.test.ts"
];

let hasFailure = false;

for (const file of testFiles) {
    console.log(`\n▶ Running ${file}...\n`);
    try {
        execSync(`npx vitest run ${file}`, {
            stdio: "inherit",
            env: { ...process.env, NODE_ENV: "test" }
        });
    } catch (err) {
        hasFailure = true;
        console.error(`\n✗ ${file} FAILED\n`);
    }
}

if (hasFailure) {
    console.error("\n❌ Some test files failed.\n");
    process.exit(1);
} else {
    console.log("\n✅ All test files passed.\n");
    process.exit(0);
}
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");

function classifyRequest(prompt) {
    const text = String(prompt || "").toLowerCase();

    const multiAppTerms = [
        "multi-app",
        "multi app",
        "multiple applications",
        "application suite",
        "digital suite",
        "ecosystem",
        "multiple portals",
        "multiple products"
    ];

    const saasTerms = [
        "saas",
        "subscription",
        "multi-tenant",
        "multi tenant",
        "tenant",
        "hosted platform"
    ];

    const desktopTerms = [
        "desktop",
        "windows app",
        "exe",
        "electron"
    ];

    const mobileTerms = [
        "android",
        "ios",
        "mobile app",
        "cross platform mobile"
    ];

    const hostedTerms = [
        "hosted",
        "deploy online",
        "cloud deployment",
        "web hosting"
    ];

    const has = terms => terms.some(term => text.includes(term));

    return {
        applicationMode: has(multiAppTerms) ? "multi-app" : "single-app",
        saas: has(saasTerms),
        desktop: has(desktopTerms),
        mobile: has(mobileTerms),
        hosted: has(hostedTerms),
        localFirst: true,
        apiKeysRequiredForCore: false,
        promptDriven: true
    };
}

function createPlan(prompt) {
    const classification = classifyRequest(prompt);

    return {
        version: 1,
        factory: "SimeonJr Universal App Factory",
        createdAt: new Date().toISOString(),
        prompt,
        classification,
        rules: {
            promptIsSourceOfTruth: true,
            doNotHardcodeApplicationTypes: true,
            localFirst: true,
            coreRequiresNoApiKeys: true,
            productionVerificationRequired: true
        },
        pipeline: [
            "ARCHITECT",
            "PLAN",
            "GENERATE",
            "BUILD",
            "TEST",
            "REPAIR",
            "REBUILD",
            "VERIFY",
            "CHECKPOINT",
            "PACKAGE",
            "RUN_OR_DEPLOY"
        ]
    };
}

function savePlan(prompt) {
    const plan = createPlan(prompt);

    const directory = path.join(ROOT, ".factory", "plans");

    fs.mkdirSync(directory, {
        recursive: true
    });

    const stamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const file = path.join(
        directory,
        "build-plan-" + stamp + ".json"
    );

    fs.writeFileSync(
        file,
        JSON.stringify(plan, null, 2),
        "utf8"
    );

    return {
        file,
        plan
    };
}

const prompt = process.argv
    .slice(2)
    .join(" ")
    .trim();

console.log("");
console.log("==================================================");
console.log(" SIMEONJR UNIVERSAL FACTORY CONTROLLER");
console.log("==================================================");

if (!prompt) {
    console.log("");
    console.log("Controller ready.");
    console.log("Architecture is determined from the user's prompt.");
} else {
    const result = savePlan(prompt);
    const c = result.plan.classification;

    console.log("");
    console.log("PROMPT:");
    console.log(prompt);

    console.log("");
    console.log("ARCHITECTURE");
    console.log("Application mode :", c.applicationMode);
    console.log("SaaS             :", c.saas ? "YES" : "NO");
    console.log("Desktop          :", c.desktop ? "YES" : "NO");
    console.log("Mobile           :", c.mobile ? "YES" : "NO");
    console.log("Hosted           :", c.hosted ? "YES" : "NO");
    console.log("Local-first      : YES");
    console.log("Core API keys    : NO");

    console.log("");
    console.log("PLAN:");
    console.log(result.file);
}

console.log("");
console.log("UNIVERSAL FACTORY CONTROLLER: READY");
console.log("==================================================");

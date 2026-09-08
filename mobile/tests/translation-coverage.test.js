import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import copy from "../src/constants/messages/ui";
import en from "../src/constants/messages/en";

function files(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? files(file) : file.endsWith(".js") ? [file] : [];
    });
}

test("every literal translation key used by the app exists in the bilingual dictionary", () => {
    const root = path.resolve(__dirname, "..");
    const missing = [];
    for (const file of [...files(path.join(root, "src")), path.join(root, "App.js")]) {
        if (file.includes(`${path.sep}messages${path.sep}`)) continue;
        const ast = parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] });
        traverse(ast, {
            CallExpression({ node }) {
                if (node.callee.name === "t" && node.arguments[0]?.type === "StringLiteral") {
                    const key = node.arguments[0].value;
                    if (!copy[key]) missing.push(`${path.relative(root, file)}: ${key}`);
                }
            },
            MemberExpression({ node }) {
                const parts = [];
                let current = node;
                while (current.type === "MemberExpression" && !current.computed) {
                    parts.unshift(current.property.name);
                    current = current.object;
                }
                if (current.name !== "messages") return;
                if (parts.reduce((value, key) => value?.[key], en) === undefined) {
                    missing.push(`${path.relative(root, file)}: messages.${parts.join(".")}`);
                }
            },
        });
    }
    expect(missing).toEqual([]);
});

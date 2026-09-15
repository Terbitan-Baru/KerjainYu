import fs from "fs";
import { createUploadUrl } from "../../services/storage.service";
import "dotenv/config";
async function main() {
    const objectKey = "submissions/123/report.txt";

    const file = fs.readFileSync("./report.txt");

    const uploadUrl = await createUploadUrl(
        objectKey,
        "text/plain",
        file.length,
    );

    const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Type": "text/plain",
        },
        body: file,
    });

}

main().catch(console.error);
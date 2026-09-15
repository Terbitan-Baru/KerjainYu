import {
    describe,
    it,
    expect,
    beforeAll,
    beforeEach,
    afterAll,
} from "vitest";
import express from "express";
import request from "supertest";
import type { AuthRequest } from "../../middlewares/auth.middlewares";
import { uploadRateLimiter } from "../../middlewares/rateLimiter";
import { redisClient, initRedis } from "../../config/redis";


let app: express.Express;

const originalNodeEnv = process.env.NODE_ENV;

beforeAll(async () => {
    // Set NODE_ENV ke sesuatu selain "test" SEBELUM request dikirim,
    // supaya nilai yang dibaca closure `skip` di dalam limiter tidak
    // men-skip request kita. Middleware `skip` membaca
    // process.env.NODE_ENV di setiap request (bukan sekali saat modul
    // di-load), jadi cukup ubah env sebelum tiap request dikirim di test
    // ini — tidak perlu re-import modul.
    process.env.NODE_ENV = "development";

    await initRedis();

    app = express();
    app.use(express.json());

    // Middleware auth palsu: membaca userId dari header supaya test bisa
    // mensimulasikan user yang berbeda-beda tanpa perlu login sungguhan.
    app.use((req: AuthRequest, _res, next) => {
        const userId = req.header("x-test-user-id");
        if (userId) {
            req.user = { id: Number(userId), username: `user${userId}` };
        }
        next();
    });

    app.post("/upload-url", uploadRateLimiter, (_req, res) => {
        res.status(200).json({ success: true });
    });
});

beforeEach(async () => {
    // PENTING: `uploadRateLimiter` memakai RedisStore singleton (dibuat
    // sekali saat modul rateLimiter.ts di-import) dengan window 1 jam.
    // Tanpa pembersihan ini, sisa counter dari run test sebelumnya (yang
    // belum melewati window 1 jam) akan ikut terbawa dan membuat test ini
    // langsung ke-429 di request pertama, alih-alih baru ke-429 di
    // request ke-41 seperti yang diharapkan.
    const keys = await redisClient.keys("rl:upload:*");
    if (keys.length > 0) {
        await redisClient.del(...keys);
    }
});

afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
});

describe("uploadRateLimiter", () => {
    it("should allow requests under the limit and reject the 41st request from the same user within the window", async () => {
        const userId = "12345";

        let lastRes: request.Response | undefined;

        for (let i = 0; i < 40; i++) {
            lastRes = await request(app)
                .post("/upload-url")
                .set("x-test-user-id", userId);
            expect(lastRes.status).toBe(200);
        }

        const res41 = await request(app)
            .post("/upload-url")
            .set("x-test-user-id", userId);

        expect(res41.status).toBe(429);
        expect(res41.body.error.code).toBe("TOO_MANY_UPLOAD_REQUESTS");
    });

    it("should key the limit by user, not by IP: a different user is unaffected by another user's quota", async () => {
        const exhaustedUser = "99991";
        const freshUser = "99992";

        for (let i = 0; i < 40; i++) {
            const res = await request(app)
                .post("/upload-url")
                .set("x-test-user-id", exhaustedUser);
            expect(res.status).toBe(200);
        }

        const exhaustedRes = await request(app)
            .post("/upload-url")
            .set("x-test-user-id", exhaustedUser);
        expect(exhaustedRes.status).toBe(429);

        // Different user, same IP (supertest requests all originate from
        // the same local address) — should NOT be blocked, proving the
        // limiter is keyed by user id rather than by IP.
        const freshRes = await request(app)
            .post("/upload-url")
            .set("x-test-user-id", freshUser);
        expect(freshRes.status).toBe(200);
    });
});

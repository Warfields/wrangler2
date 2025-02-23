import { fork } from "child_process";
import * as path from "path";
import { fetch } from "undici";
import { describe, it, beforeAll, afterAll } from "vitest";
import type { ChildProcess } from "child_process";

describe.concurrent("Pages Advanced Mode with custom _routes.json", () => {
	let wranglerProcess: ChildProcess;
	let ip: string;
	let port: number;

	beforeAll(async () => {
		await new Promise((resolve) => {
			wranglerProcess = fork(
				path.join("..", "..", "packages", "wrangler", "bin", "wrangler.js"),
				["pages", "dev", "public", "--port=0"],
				{
					stdio: ["inherit", "inherit", "inherit", "ipc"],
					cwd: path.resolve(__dirname, ".."),
				}
			).on("message", (message) => {
				const parsedMessage = JSON.parse(message.toString());
				ip = parsedMessage.ip;
				port = parsedMessage.port;
				resolve(undefined);
			});
		});
	});

	afterAll(async () => {
		await new Promise((resolve, reject) => {
			wranglerProcess.once("exit", (code) => {
				if (!code) {
					resolve(code);
				} else {
					reject(code);
				}
			});
			wranglerProcess.kill("SIGTERM");
		});
	});

	it("renders static pages", async ({ expect }) => {
		const response = await fetch(`http://${ip}:${port}/`);
		const text = await response.text();
		expect(text).toContain(
			"Bienvenue sur notre projet &#10024; pages-workerjs-with-routes-app!"
		);
	});

	it("runs our _worker.js", async ({ expect }) => {
		// matches /greeting/* include rule
		let response = await fetch(`http://${ip}:${port}/greeting/hello`);
		let text = await response.text();
		expect(text).toEqual("[/greeting/hello]: Bonjour le monde!");

		// matches /greeting/* include rule
		response = await fetch(`http://${ip}:${port}/greeting/bye`);
		text = await response.text();
		expect(text).toEqual("[/greeting/bye]: A plus tard alligator 👋");

		// matches /date include rule
		response = await fetch(`http://${ip}:${port}/date`);
		text = await response.text();
		expect(text).toMatch(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/);

		// matches both /party* include and /party exclude rules, but exclude
		// has priority
		response = await fetch(`http://${ip}:${port}/party`);
		text = await response.text();
		expect(text).toContain(
			"Bienvenue sur notre projet &#10024; pages-workerjs-with-routes-app!"
		);

		// matches /party* include rule
		response = await fetch(`http://${ip}:${port}/party-disco`);
		text = await response.text();
		expect(text).toEqual("[/party-disco]: Tout le monde à la discothèque 🪩");

		// matches /greeting/* include rule
		response = await fetch(`http://${ip}:${port}/greeting`);
		text = await response.text();
		expect(text).toEqual("[/greeting]: Bonjour à tous!");

		// matches no rule
		response = await fetch(`http://${ip}:${port}/greetings`);
		text = await response.text();
		expect(text).toContain(
			"Bienvenue sur notre projet &#10024; pages-workerjs-with-routes-app!"
		);
	});
});

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
		include: ["src/**/*.integration.test.ts"],
		environment: "node",
		testTimeout: 15000,
		hookTimeout: 20000,
		fileParallelism: false,
	},
});

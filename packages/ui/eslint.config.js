import storybook from "eslint-plugin-storybook";
import { react } from "@virzeen/config/eslint/react";

export default [...react, ...storybook.configs["flat/recommended"], { ignores: ["storybook-static/**"] }];

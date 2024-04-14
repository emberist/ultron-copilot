import inquirer from "inquirer";
import { Profile, profiles } from "../../common/constants";

export const inputProfile = () => {
  return inquirer.prompt<{ profile: Profile }>([
    {
      type: "list",
      name: "profile",
      message: "Choose the profile to use:",
      choices: profiles,
    },
  ]);
};

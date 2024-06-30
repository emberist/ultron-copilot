import { match } from "ts-pattern";
import { Profile } from "../../common/constants";

export const getKeypairVariableName = (profile: Profile) =>
  match(profile)
    .with("Profile 1", () => "PROFILE_1_SECRET_KEY")
    .with("Profile 2", () => "PROFILE_2_SECRET_KEY")
    .with("Profile 3", () => "PROFILE_3_SECRET_KEY")
    .exhaustive();

import { match } from "ts-pattern";
import { Profile } from "../../common/constants";

export const getRpcVariableName = (profile: Profile) =>
  match(profile)
    .with("Profile 1", () => "PROFILE_1_RPC")
    .with("Profile 2", () => "PROFILE_2_RPC")
    .with("Profile 3", () => "PROFILE_3_RPC")
    .exhaustive();

import { Profile, keypairPaths } from "../../common/constants";

export const getProfileKeypairPath = (profile: Profile) =>
  keypairPaths[profile];

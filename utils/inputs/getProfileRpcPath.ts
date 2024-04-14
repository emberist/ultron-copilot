import { Profile, rpcPaths } from "../../common/constants";

export const getProfileRpcPath = (profile: Profile) => rpcPaths[profile];

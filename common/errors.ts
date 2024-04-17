export class NoEnoughRepairKits extends Error {
  constructor() {
    super("NoEnoughRepairKits");
    this.name = "NoEnoughRepairKits";
  }
}

export class NoEnoughTokensToPerformSageAction extends Error {
  constructor() {
    super("NoEnoughTokensToPerformSageAction");
    this.name = "NoEnoughTokensToPerformSageAction";
  }
}

export class BuildAndSignTransactionError extends Error {
  constructor() {
    super("BuildAndSignTransactionError");
    this.name = "BuildAndSignTransactionError";
  }
}

export class SendTransactionFailed extends Error {
  constructor() {
    super("SendTransactionFailed");
    this.name = "SendTransactionFailed";
  }
}

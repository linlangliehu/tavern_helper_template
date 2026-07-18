/**
 * 只读运行时身份登记。不改变业务语义，仅供开发/验收证明 bundle 来源。
 */
type MfrsBuildMeta = {
  mode: 'development' | 'production' | string;
  commit: string;
  branch?: string;
  builtAt?: string;
  workspace?: string;
};

declare const __MFRS_BUILD_META__: MfrsBuildMeta;
declare const __MFRS_DEV_BUILD__: MfrsBuildMeta | undefined;

type HostWindow = Window & {
  __mfrsRuntimeBuilds__?: Record<string, MfrsBuildMeta>;
};

function getHostWindow(): HostWindow {
  try {
    return (window.parent ?? window) as HostWindow;
  } catch {
    return window as HostWindow;
  }
}

export function registerMfrsRuntimeBuild(entryName: string): void {
  const meta =
    typeof __MFRS_DEV_BUILD__ !== 'undefined' && __MFRS_DEV_BUILD__
      ? __MFRS_DEV_BUILD__
      : typeof __MFRS_BUILD_META__ !== 'undefined'
        ? __MFRS_BUILD_META__
        : { mode: 'unknown', commit: 'unknown' };

  try {
    const host = getHostWindow();
    host.__mfrsRuntimeBuilds__ ??= {};
    host.__mfrsRuntimeBuilds__[entryName] = meta;
    // 同步到当前 iframe window，便于 iframe 内直接读取
    (window as HostWindow).__mfrsRuntimeBuilds__ = host.__mfrsRuntimeBuilds__;
  } catch {
    // ignore cross-origin / sandbox failures
  }
}

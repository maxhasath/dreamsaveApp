import path from 'path';

export type EnvName = 'dev' | 'stage' | 'prod';

interface EnvConfig {
  appPkg:  string;
  appPath: string;
}

const CONFIGS: Record<EnvName, EnvConfig> = {
  dev: {
    appPkg:  'com.dreamstartlabs.dreamsave.dev',
    appPath: path.resolve(__dirname, '..', 'apps', 'dreamsave-dev.apk'),
  },
  stage: {
    appPkg:  'com.dreamstartlabs.dreamsave.staging.beta',
    appPath: path.resolve(__dirname, '..', 'apps', 'dreamsave-staging.apk'),
  },
  prod: {
    appPkg:  'com.dreamstartlabs.dreamsave',
    appPath: path.resolve(__dirname, '..', 'apps', 'dreamsave-prod.apk'),
  },
};

const envName = (process.env.TEST_ENV ?? 'stage') as EnvName;

if (!CONFIGS[envName]) {
  throw new Error(
    `Unknown TEST_ENV="${envName}". Valid values: ${Object.keys(CONFIGS).join(', ')}`,
  );
}

export const ENV      = CONFIGS[envName];
export const APP_PKG  = ENV.appPkg;
export const APP_PATH = ENV.appPath;

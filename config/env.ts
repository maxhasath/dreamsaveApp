import path from 'path';

export type EnvName = 'dev' | 'stage' | 'qa' | 'prod';

interface EnvConfig {
  appPkg:      string;
  appPath:     string;
  partnerId:   string; // Partner ID typed during group creation
  partnerName: string; // name the app resolves it to ('' = not asserted)
}

const CONFIGS: Record<EnvName, EnvConfig> = {
  dev: {
    appPkg:  'com.dreamstartlabs.dreamsave.dev',
    appPath: path.resolve(__dirname, '..', 'apps', 'dreamsave-dev.apk'),
    partnerId:   '2403',
    partnerName: 'World Vision',
  },
  stage: {
    appPkg:  'com.dreamstartlabs.dreamsave.staging.beta',
    appPath: path.resolve(__dirname, '..', 'apps', 'dreamsave-staging.apk'),
    partnerId:   '2403',
    partnerName: 'World Vision',
  },
  qa: {
    appPkg:  'com.dreamstartlabs.dreamsave.qa.beta',
    appPath: path.resolve(__dirname, '..', 'apps', 'dreamsave-qa.apk'),
    partnerId:   '2403',
    partnerName: 'World Vision',
  },
  prod: {
    appPkg:  'com.dreamstartlabs.dreamsave',
    appPath: path.resolve(__dirname, '..', 'apps', 'dreamsave-prod.apk'),
    // Production only ever gets the test partner, so real partners are never touched.
    partnerId:   '0000',
    partnerName: '',
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
export const PARTNER   = { id: ENV.partnerId, name: ENV.partnerName };

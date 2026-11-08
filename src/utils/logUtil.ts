const isTestEnv = import.meta.env.VITE_ENV === 'test';

const logUtil = {
    log: <T>(...args: T[]) => {
        if (isTestEnv) {
            logUtil.log(...args);
        }
    },
    warn: <T>(...args: T[]) => {
        if (isTestEnv) {
            console.warn(...args);
        }
    },
    error: <T>(...args: T[]) => {
        if (isTestEnv) {
            console.error(...args);
        }
    },
};

export default logUtil;
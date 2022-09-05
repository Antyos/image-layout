/* eslint-disable @typescript-eslint/naming-convention, import/no-anonymous-default-export */
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
export default {
    rootDir: 'src',
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    transformIgnorePatterns: ['<rootDir>/node_modules/'],
};

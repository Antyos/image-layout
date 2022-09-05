/* eslint-disable import/no-anonymous-default-export */
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
export default {
    preset: 'ts-jest/presets/js-with-ts-esm',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['./jest.setup.ts'],
};

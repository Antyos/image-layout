import { toMatchCloseTo, toBeDeepCloseTo } from 'jest-matcher-deep-close-to';

// Patch `toMatchCloseTo` and `toBeDeepCloseTo` into jest's expect()
// I'm not really if this is a good idea, but it seems to work
interface MaybeHasJestExpect {
    expect?: jest.Expect;
}

// Based on: https://github.com/jest-community/jest-extended/blob/2bd088758d08a5ada82f28d26757f1d7f4ccaca4/src/all/index.js
const jestExpect = (global as unknown as MaybeHasJestExpect).expect;

if (jestExpect === undefined) {
    throw new Error(
        "Unable to find Jest's global expect. " +
            'Please check you have added jest-extended correctly to your jest configuration. ' +
            'See https://github.com/jest-community/jest-extended#setup for help.',
    );
}

jestExpect.extend({ toMatchCloseTo, toBeDeepCloseTo });

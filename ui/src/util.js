export const getUtcUnixTime = () => Math.floor(new Date().getTime() / 1000);

export const inTermsOfToString = inTermsOf => inTermsOf.sort((a, b) => a - b).join(',');

export const unique = arr => arr.filter((v, i, a) => a.indexOf(v) === i);

export default {
    getUtcUnixTime,
    inTermsOfToString,
    unique
};

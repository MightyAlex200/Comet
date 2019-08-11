export const getUtcUnixTime = () => Math.floor(new Date().getTime() / 1000);

export const inTermsOfToString = inTermsOf => inTermsOf.sort((a, b) => a - b).join(',');

export default {
    getUtcUnixTime,
    inTermsOfToString,
};

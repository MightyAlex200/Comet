//@ts-check
export default function makeUnique(array) {
    return Object.keys(array.reduce((acc, item) => acc[item] = acc, {}));
}
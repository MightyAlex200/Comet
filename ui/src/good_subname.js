//@ts-check
export default function isGoodSubName(subName) {
    return subName != '' && subName.trim().toLowerCase() == subName;
}
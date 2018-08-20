//@ts-check
export default function isGoodTagName(tagName) {
    return tagName != '' && tagName.trim().toLowerCase() == tagName;
}
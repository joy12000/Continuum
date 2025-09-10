import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
const Highlight = ({ text, query }) => {
    if (!query)
        return _jsx(_Fragment, { children: text });
    const lowerCaseText = text.toLowerCase();
    const lowerCaseQuery = query.toLowerCase();
    const parts = [];
    let lastIndex = 0;
    let index = lowerCaseText.indexOf(lowerCaseQuery, lastIndex);
    while (index !== -1) {
        parts.push(text.substring(lastIndex, index));
        parts.push(_jsx("mark", { className: "bg-accent text-accent-foreground rounded px-1", children: text.substring(index, index + query.length) }, index));
        lastIndex = index + query.length;
        index = lowerCaseText.indexOf(lowerCaseQuery, lastIndex);
    }
    parts.push(text.substring(lastIndex));
    return _jsx(_Fragment, { children: parts });
};
export default Highlight;

import React from 'react';
import ReactMarkdown from 'react-markdown';

function MarkdownRenderer(props) {
    const newProps = {
        ...props,
        disallowedTypes: ['image', 'imageReference'],
    };
    return (
        <ReactMarkdown {...newProps} />
    );
}

export default MarkdownRenderer;

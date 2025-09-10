import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import PageLayout from '../components/PageLayout';
const DeveloperPage = () => {
    const [output, setOutput] = useState('Click a button to test an API endpoint.');
    const [loading, setLoading] = useState(false);
    const runTest = async (testFn) => {
        setLoading(true);
        setOutput('Running test...');
        try {
            const result = await testFn();
            setOutput(JSON.stringify(result, null, 2));
        }
        catch (error) {
            setOutput(`Error: ${error.message}\n\n${error.stack}`);
        }
        setLoading(false);
    };
    const testSearch = async () => {
        const res = await fetch('/api/v1?action=search&q=test');
        if (!res.ok)
            throw new Error(`Search failed with status ${res.status}`);
        return res.json();
    };
    const testCreateEmbedding = async () => {
        const res = await fetch('/api/v1?action=create-embedding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts: ['hello world', 'test embedding'] }),
        });
        if (!res.ok)
            throw new Error(`Create Embedding failed with status ${res.status}`);
        return res.json();
    };
    const testGenerate = async () => {
        const res = await fetch('/api/v1?action=generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'rag',
                input: { query: 'What is RAG?' },
                context: [{ id: '1', body: 'RAG stands for Retrieval-Augmented Generation.' }]
            }),
        });
        if (!res.ok)
            throw new Error(`Generate failed with status ${res.status}`);
        return res.json();
    };
    const TestButton = ({ name, onClick }) => (_jsx("button", { onClick: onClick, disabled: loading, className: "bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed", children: name }));
    return (_jsx(PageLayout, { title: "Developer API Tests", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex space-x-4", children: [_jsx(TestButton, { name: "Test Search", onClick: () => runTest(testSearch) }), _jsx(TestButton, { name: "Test Create Embedding", onClick: () => runTest(testCreateEmbedding) }), _jsx(TestButton, { name: "Test Generate (RAG)", onClick: () => runTest(testGenerate) })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold mb-2", children: "Output:" }), _jsx("pre", { className: "bg-gray-900 text-green-300 p-4 rounded-lg whitespace-pre-wrap font-mono text-sm h-96 overflow-y-auto", children: loading ? 'Loading...' : output })] })] }) }));
};
export default DeveloperPage;

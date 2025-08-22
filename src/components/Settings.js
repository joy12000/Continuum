import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { db } from "../lib/db";
import ConfirmModal from "./ConfirmModal";
import { toast } from "../lib/toast";
import { DedupSuggestions } from "./DedupSuggestions";
export function Settings({ onChange, onNavigateToDiagnostics }) {
    const [engine, setEngine] = useState(() => localStorage.getItem("semanticEngine") || "auto");
    const [snapshots, setSnapshots] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [modalState, setModalState] = useState({ isOpen: false, snapshot: null });
    useEffect(() => {
        localStorage.setItem("semanticEngine", engine);
        onChange?.(engine);
    }, [engine]);
    const fetchSnapshots = useCallback(async () => {
        try {
            setLoading(true);
            const snapshotData = await db.snapshots.orderBy("createdAt").reverse().toArray();
            setSnapshots(snapshotData);
        }
        catch (err) {
            setError("스냅샷을 불러오는 데 실패했습니다.");
            console.error(err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    const fetchNotes = useCallback(async () => {
        try {
            const allNotes = await db.notes.toArray();
            setNotes(allNotes);
        }
        catch (err) {
            console.error("노트를 불러오는 데 실패했습니다.", err);
        }
    }, []);
    useEffect(() => {
        fetchSnapshots();
        fetchNotes();
    }, [fetchSnapshots, fetchNotes]);
    const handleCreateSnapshot = async () => {
        try {
            const noteCount = await db.notes.count();
            const snapshot = {
                id: crypto.randomUUID(),
                createdAt: Date.now(),
                noteCount: noteCount,
            };
            await db.snapshots.add(snapshot);
            toast.success("스냅샷이 생성되었습니다!");
            fetchSnapshots(); // Refresh the list
        }
        catch (err) {
            toast.error("스냅샷 생성에 실패했습니다.");
            console.error(err);
        }
    };
    const handleRestoreClick = (snapshot) => {
        setModalState({ isOpen: true, snapshot });
    };
    const handleConfirmRestore = async () => {
        if (!modalState.snapshot)
            return;
        // Restore logic here...
        setModalState({ isOpen: false, snapshot: null });
    };
    const handleCancelRestore = () => {
        setModalState({ isOpen: false, snapshot: null });
    };
    const handleMerge = async (keep, remove) => {
        try {
            await db.mergeNotes(keep, remove);
            toast.success(`${remove.length}개의 노트가 병합되었습니다.`);
            // Refresh notes after merging
            fetchNotes();
        }
        catch (error) {
            toast.error("노트 병합에 실패했습니다.");
            console.error(error);
        }
    };
    const handleExportNotes = async () => {
        try {
            const allNotes = await db.notes.toArray();
            const dataStr = JSON.stringify(allNotes, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `continuum_notes_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('노트가 성공적으로 내보내졌습니다!');
        }
        catch (err) {
            console.error('Failed to export notes:', err);
            toast.error('노트 내보내기에 실패했습니다.');
        }
    };
    const handleImportNotes = async (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            toast.warn('가져올 파일을 선택해주세요.');
            return;
        }
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedNotes = JSON.parse(e.target?.result);
                    if (!Array.isArray(importedNotes) || !importedNotes.every(note => 'content' in note && 'createdAt' in note)) {
                        throw new Error('유효하지 않은 JSON 파일 형식입니다. 노트 배열이 필요합니다.');
                    }
                    // 기존 노트와 충돌 시 업데이트, 없으면 추가
                    await db.notes.bulkPut(importedNotes);
                    toast.success(`${importedNotes.length}개의 노트가 성공적으로 가져와졌습니다!`);
                    fetchNotes(); // 노트 목록 새로고침
                }
                catch (parseError) {
                    console.error('Failed to parse imported file:', parseError);
                    toast.error(`파일 파싱 오류: ${parseError.message}`);
                }
            };
            reader.readAsText(file);
        }
        catch (err) {
            console.error('Failed to import notes:', err);
            toast.error('노트 가져오기에 실패했습니다.');
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "card mt-4", children: [_jsx("h2", { className: "text-lg font-semibold mb-3", children: "\uC2A4\uB0C5\uC0F7 \uAD00\uB9AC" }), _jsx("button", { onClick: handleCreateSnapshot, disabled: loading, className: "btn btn-primary mb-4", children: loading ? '스냅샷 생성 중...' : '현재 상태 스냅샷 생성' }), error && _jsx("div", { className: "text-red-500 mb-4", children: error }), snapshots.length === 0 ? (_jsx("p", { className: "text-slate-500", children: "\uC800\uC7A5\uB41C \uC2A4\uB0C5\uC0F7\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (_jsx("ul", { className: "space-y-2", children: snapshots.map(snapshot => (_jsxs("li", { className: "flex justify-between items-center p-2 bg-slate-700/50 rounded-md", children: [_jsxs("span", { children: [new Date(snapshot.createdAt).toLocaleString(), " (", snapshot.noteCount, " \uB178\uD2B8)"] }), _jsx("button", { onClick: () => handleRestoreClick(snapshot), className: "btn btn-sm", children: "\uBCF5\uC6D0" })] }, snapshot.id))) }))] }), _jsxs("div", { className: "card mt-4", children: [_jsx("h2", { className: "text-lg font-semibold mb-3", children: "\uB370\uC774\uD130 \uBC31\uC5C5 \uBC0F \uBCF5\uC6D0" }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2", children: [_jsx("button", { onClick: handleExportNotes, className: "btn btn-outline flex-1", children: "\uBAA8\uB4E0 \uB178\uD2B8 \uB0B4\uBCF4\uB0B4\uAE30 (JSON)" }), _jsx("input", { type: "file", accept: ".json", onChange: handleImportNotes, className: "hidden", id: "import-notes-file-input" }), _jsx("label", { htmlFor: "import-notes-file-input", className: "btn btn-outline flex-1 cursor-pointer text-center", children: "\uB178\uD2B8 \uAC00\uC838\uC624\uAE30 (JSON)" })] })] }), _jsxs("div", { className: "card mt-4", children: [_jsx("h2", { className: "text-lg font-semibold mb-3", children: "\uC911\uBCF5 \uB178\uD2B8 \uAD00\uB9AC" }), _jsx(DedupSuggestions, { notes: notes, engine: engine, onMerge: handleMerge })] }), _jsx("div", { className: "card mt-4", children: _jsx("button", { onClick: onNavigateToDiagnostics, className: "w-full text-center py-2 text-blue-500 hover:underline", children: "\uAC1C\uBC1C\uC790 \uB3C4\uAD6C" }) }), _jsx(ConfirmModal, { isOpen: modalState.isOpen, title: "\uC2A4\uB0C5\uC0F7 \uBCF5\uC6D0 \uD655\uC778", message: "\uC815\uB9D0\uB85C \uC774 \uC2A4\uB0C5\uC0F7\uC744 \uBCF5\uC6D0\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C? \uD604\uC7AC \uBAA8\uB4E0 \uB370\uC774\uD130\uAC00 \uC2A4\uB0C5\uC0F7 \uC2DC\uC810\uC758 \uB370\uC774\uD130\uB85C \uB300\uCCB4\uB429\uB2C8\uB2E4. \uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.", onConfirm: handleConfirmRestore, onCancel: handleCancelRestore })] }));
}

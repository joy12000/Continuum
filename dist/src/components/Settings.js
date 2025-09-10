import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { db } from "../lib/db";
import ConfirmModal from "./ConfirmModal";
import { toast } from "../lib/toast";
import { DedupSuggestions } from "./DedupSuggestions";
import { ArrowLeft } from 'lucide-react';
import { ModelStatus } from "./ModelStatus";
import { supabase } from "../lib/supabase";
import { deleteAllUserData, bulkAddNotes, listNotes } from "../lib/supabaseService";
import { SettingsCard } from "./SettingsCard";
import SkyCanvasAnimation from "./SkyCanvasAnimation";
import { usePWAInstall } from "../hooks/usePWAInstall";
export function Settings({ engine, setEngine, onNavigateHome, onNavigateToDiagnostics, modelStatus }) {
    const [snapshots, setSnapshots] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [modalState, setModalState] = useState({ isOpen: false, snapshot: null });
    const { canInstall, triggerInstall } = usePWAInstall();
    useEffect(() => {
        localStorage.setItem("semanticEngine", engine);
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
        toast.info("스냅샷 복원 기능은 아직 구현되지 않았습니다.");
        setModalState({ isOpen: false, snapshot: null });
    };
    const handleCancelRestore = () => {
        setModalState({ isOpen: false, snapshot: null });
    };
    const handleMerge = async (keep, remove) => {
        try {
            await db.mergeNotes(keep, remove);
            toast.success(`${remove.length}개의 노트가 병합되었습니다.`);
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
            a.download = `momentum_notes_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
        const confirmed = confirm(`가져오기를 진행하시겠습니까? 현재 모든 데이터가 가져온 파일의 내용으로 대체됩니다. 이 작업은 되돌릴 수 없습니다.`);
        if (!confirmed) {
            toast.info("가져오기가 취소되었습니다.");
            return;
        }
        let backupNotes = [];
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedNotes = JSON.parse(e.target?.result);
                    if (!Array.isArray(importedNotes) || !importedNotes.every(note => ('content' in note || 'body' in note))) {
                        throw new Error('유효하지 않은 JSON 파일 형식입니다. 노트 배열이 필요합니다.');
                    }
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                        toast.error("로그인이 필요합니다.");
                        return;
                    }
                    // 1. Backup existing data
                    toast.info("기존 데이터 백업 중...");
                    const backupData = await listNotes(user.id);
                    if (backupData) {
                        backupNotes = backupData.map((n) => ({
                            id: n.id,
                            title: n.title,
                            body: n.body,
                            createdAt: new Date(n.created_at).getTime(),
                            updatedAt: new Date(n.updated_at).getTime(),
                            tags: n.tags || [],
                            citations: n.citations || [],
                        }));
                    }
                    // 2. Delete existing data
                    toast.info("기존 데이터를 삭제하는 중... (시간이 걸릴 수 있습니다)");
                    await deleteAllUserData(user.id);
                    // 3. Import new data
                    toast.info(`${importedNotes.length}개의 노트를 가져오는 중... (시간이 매우 오래 걸릴 수 있습니다)`);
                    const notesToBulkAdd = importedNotes.map(n => ({ title: n.title, body: n.body || '' }));
                    await bulkAddNotes(notesToBulkAdd, user.id);
                    await db.notes.clear();
                    toast.success(`가져오기 완료: ${importedNotes.length}개의 노트. 페이지를 새로고침합니다.`);
                    setTimeout(() => window.location.reload(), 1500);
                }
                catch (importError) {
                    console.error('Failed during import process:', importError);
                    toast.error(`가져오기 실패: ${importError.message}`);
                    // 4. Restore from backup if import failed
                    if (backupNotes.length > 0) {
                        toast.info("오류 발생. 백업 데이터 복원 시도 중...");
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (user) {
                                await bulkAddNotes(backupNotes.map(n => ({ title: n.title, body: n.body || '' })), user.id);
                                toast.success("백업 데이터가 성공적으로 복원되었습니다.");
                            }
                        }
                        catch (restoreError) {
                            console.error('Failed to restore backup:', restoreError);
                            toast.error("백업 복원에 실패했습니다. 수동으로 데이터를 확인해주세요.");
                        }
                    }
                }
            };
            reader.readAsText(file);
        }
        catch (err) {
            console.error('Failed to import notes:', err);
            toast.error('노트 가져오기에 실패했습니다.');
        }
    };
    const handleClearAllData = async () => {
        const confirmed = confirm("정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 노트, 스냅샷 및 기타 데이터가 영구적으로 삭제됩니다.");
        if (!confirmed) {
            toast.info("데이터 삭제가 취소되었습니다.");
            return;
        }
        try {
            toast.info("모든 데이터를 삭제하는 중...");
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await deleteAllUserData(user.id);
            }
            await db.delete(); // Deletes the entire database
            toast.success("모든 데이터가 삭제되었습니다. 페이지를 새로고침합니다.");
            setTimeout(() => window.location.reload(), 1500);
        }
        catch (err) {
            toast.error("데이터 삭제에 실패했습니다.");
            console.error(err);
        }
    };
    return (_jsxs("div", { className: "relative p-3 bg-slate-900 text-slate-100 font-sans min-h-screen isolate", children: [_jsx(SkyCanvasAnimation, {}), _jsxs("div", { className: "relative z-10", children: [_jsxs("header", { className: "flex items-center justify-between mb-4", children: [_jsx("h1", { className: "text-xl font-bold", children: "\uC124\uC815" }), _jsx("button", { onClick: onNavigateHome, className: "p-2 rounded-full hover:bg-slate-800", children: _jsx(ArrowLeft, { size: 24 }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs(SettingsCard, { title: "\uC784\uBCA0\uB529 \uBAA8\uB4DC", children: [_jsxs("select", { value: engine, onChange: (e) => setEngine(e.target.value), className: "select select-bordered w-full bg-slate-700 text-slate-100", children: [_jsx("option", { value: "auto", children: "\uC790\uB3D9 (On-device)" }), _jsx("option", { value: "remote", children: "\uC6D0\uACA9 API" })] }), _jsx("p", { className: "text-sm text-slate-400 mt-2", children: "'\uC790\uB3D9'\uC740 \uAE30\uAE30 \uB0B4\uC5D0\uC11C \uC784\uBCA0\uB529\uC744 \uCC98\uB9AC\uD558\uC5EC \uBE60\uB974\uACE0 \uD504\uB77C\uC774\uBC84\uC2DC\uAC00 \uBCF4\uD638\uB429\uB2C8\uB2E4. '\uC6D0\uACA9 API'\uB294 \uB354 \uAC15\uB825\uD55C \uBAA8\uB378\uC744 \uC0AC\uC6A9\uD558\uC9C0\uB9CC \uC778\uD130\uB137 \uC5F0\uACB0\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }), _jsx("div", { className: "mt-2", children: _jsx(ModelStatus, { status: modelStatus }) })] }), _jsx(SettingsCard, { title: "\uB370\uC774\uD130 \uAD00\uB9AC", children: _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: [_jsx("button", { onClick: handleExportNotes, className: "btn btn-primary flex-1", children: "\uBAA8\uB4E0 \uB178\uD2B8 \uB0B4\uBCF4\uB0B4\uAE30 (JSON)" }), _jsx("input", { type: "file", accept: ".json", onChange: handleImportNotes, className: "hidden", id: "import-notes-file-input" }), _jsx("label", { htmlFor: "import-notes-file-input", className: "btn btn-secondary flex-1 cursor-pointer", children: "\uB178\uD2B8 \uAC00\uC838\uC624\uAE30 (JSON)" })] }) }), _jsxs(SettingsCard, { title: "\uC2A4\uB0C5\uC0F7 \uAD00\uB9AC", children: [_jsx("button", { onClick: handleCreateSnapshot, disabled: loading, className: "btn btn-primary mb-4 w-full", children: loading ? '스냅샷 생성 중...' : '현재 상태 스냅샷 생성' }), error && _jsx("div", { className: "text-red-500 mb-4", children: error }), snapshots.length === 0 ? (_jsx("p", { className: "text-slate-400", children: "\uC800\uC7A5\uB41C \uC2A4\uB0C5\uC0F7\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (_jsx("ul", { className: "space-y-2", children: snapshots.map(snapshot => (_jsxs("li", { className: "flex justify-between items-center p-2 bg-slate-700/50 rounded-md", children: [_jsxs("span", { children: [new Date(snapshot.createdAt).toLocaleString(), " (", snapshot.noteCount, " \uB178\uD2B8)"] }), _jsx("button", { onClick: () => handleRestoreClick(snapshot), className: "btn btn-sm btn-secondary", children: "\uBCF5\uC6D0" })] }, snapshot.id))) }))] }), _jsx(SettingsCard, { title: "\uC911\uBCF5 \uB178\uD2B8 \uAD00\uB9AC", children: _jsx(DedupSuggestions, { notes: notes, engine: engine, onMerge: handleMerge }) }), canInstall && (_jsxs(SettingsCard, { title: "\uC571 \uC124\uCE58", children: [_jsx("button", { onClick: triggerInstall, className: "btn btn-primary w-full", children: "\uD648 \uD654\uBA74\uC5D0 \uC571 \uCD94\uAC00" }), _jsx("p", { className: "text-sm text-slate-400 mt-2", children: "\uC774 \uC6F9 \uC571\uC744 \uAE30\uAE30\uC5D0 \uC124\uCE58\uD558\uC5EC \uB124\uC774\uD2F0\uBE0C \uC571\uCC98\uB7FC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." })] })), _jsx(SettingsCard, { title: "\uBAA8\uC591", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { children: "\uD14C\uB9C8" }), _jsxs("select", { className: "select select-bordered bg-slate-700 text-slate-100", children: [_jsx("option", { children: "\uC2DC\uC2A4\uD15C" }), _jsx("option", { children: "\uB77C\uC774\uD2B8" }), _jsx("option", { children: "\uB2E4\uD06C" })] })] }) }), _jsx(SettingsCard, { title: "\uAC1C\uBC1C\uC790", children: _jsx("button", { onClick: onNavigateToDiagnostics, className: "w-full text-left p-2 text-sky-400 hover:underline", children: "\uAC1C\uBC1C\uC790 \uB3C4\uAD6C" }) }), _jsxs(SettingsCard, { title: "\uC704\uD5D8 \uAD6C\uC5ED", children: [_jsx("button", { onClick: handleClearAllData, className: "btn btn-error w-full", children: "\uBAA8\uB4E0 \uB370\uC774\uD130 \uC9C0\uC6B0\uAE30" }), _jsx("p", { className: "text-sm text-slate-400 mt-2", children: "\uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uBAA8\uB4E0 \uB178\uD2B8, \uC2A4\uB0C5\uC0F7 \uBC0F \uAE30\uD0C0 \uB370\uC774\uD130\uB97C \uC601\uAD6C\uC801\uC73C\uB85C \uC0AD\uC81C\uD569\uB2C8\uB2E4." })] })] }), modalState.isOpen && (_jsx(ConfirmModal, { title: "\uC2A4\uB0C5\uC0F7 \uBCF5\uC6D0 \uD655\uC778", onConfirm: handleConfirmRestore, onClose: handleCancelRestore, children: "\uC815\uB9D0\uB85C \uC774 \uC2A4\uB0C5\uC0F7\uC744 \uBCF5\uC6D0\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C? \uD604\uC7AC \uBAA8\uB4E0 \uB370\uC774\uD130\uAC00 \uC2A4\uB0C5\uC0F7 \uC2DC\uC810\uC758 \uB370\uC774\uD130\uB85C \uB300\uCCB4\uB429\uB2C8\uB2E4. \uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }))] })] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'react-hot-toast';
import { ArrowDownOnSquareIcon, ArrowLeftOnRectangleIcon, CodeBracketIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { SettingsCard } from '../components/SettingsCard';
import SkyCanvasAnimation from '../components/SkyCanvasAnimation';
import PageLayout from '../components/PageLayout';
import { usePWAInstall } from '../hooks/usePWAInstall';
const Settings = () => {
    const { canInstall, triggerInstall } = usePWAInstall();
    const navigate = useNavigate();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };
    const handleDeleteAllNotes = async () => {
        if (confirmText !== "delete all my notes") {
            toast.error('정확하게 입력해주세요.');
            return;
        }
        try {
            const { error } = await supabase.rpc('delete_all_my_notes');
            if (error)
                throw error;
            toast.success('모든 노트가 삭제되었습니다.');
            setShowDeleteConfirm(false);
            setConfirmText("");
            navigate('/');
        }
        catch (error) {
            toast.error(`노트 삭제 실패: ${error.message}`);
        }
    };
    return (_jsxs(PageLayout, { title: "\uC124\uC815", transparent: true, children: [_jsx(SkyCanvasAnimation, {}), _jsx("div", { className: "relative z-10", children: _jsxs("div", { className: "space-y-8", children: [_jsx(SettingsCard, { title: "\uAC1C\uBC1C\uC790", children: _jsxs("button", { onClick: () => navigate('/developer'), className: "w-full flex items-center justify-between p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors", children: [_jsx("span", { children: "\uAC1C\uBC1C\uC790 \uD398\uC774\uC9C0" }), _jsx(CodeBracketIcon, { className: "w-6 h-6" })] }) }), _jsx(SettingsCard, { title: "\uC571 \uC124\uCE58", children: _jsxs("button", { onClick: canInstall ? triggerInstall : undefined, disabled: !canInstall, className: "w-full flex items-center justify-between p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed", children: [_jsx("span", { children: canInstall ? "앱 설치" : "앱이 이미 설치되었거나 설치할 수 없습니다" }), _jsx(ArrowDownOnSquareIcon, { className: "w-6 h-6" })] }) }), _jsx(SettingsCard, { title: "\uACC4\uC815", children: _jsxs("button", { onClick: handleLogout, className: "w-full flex items-center justify-between p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors", children: [_jsx("span", { children: "\uB85C\uADF8\uC544\uC6C3" }), _jsx(ArrowLeftOnRectangleIcon, { className: "w-6 h-6" })] }) }), _jsx(SettingsCard, { title: "\uC704\uD5D8 \uAD6C\uC5ED", titleClassName: "text-red-400", children: _jsxs("div", { className: "p-4 border border-red-500/50 rounded-lg bg-red-500/10", children: [_jsxs("div", { className: "flex items-start", children: [_jsx(ExclamationTriangleIcon, { className: "w-8 h-8 text-red-400 mr-4 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold text-red-200", children: "\uBAA8\uB4E0 \uB178\uD2B8 \uC0AD\uC81C" }), _jsx("p", { className: "text-sm text-red-300/80 mt-1 mb-4", children: "\uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC2E0\uC911\uD558\uAC8C \uC9C4\uD589\uD574\uC8FC\uC138\uC694." })] })] }), _jsxs("button", { onClick: () => setShowDeleteConfirm(true), className: "w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors", children: [_jsx(TrashIcon, { className: "w-5 h-5" }), _jsx("span", { children: "\uBAA8\uB4E0 \uB178\uD2B8 \uC0AD\uC81C..." })] })] }) })] }) }), showDeleteConfirm && (_jsxs(ConfirmModal, { title: "\uC815\uB9D0\uB85C \uBAA8\uB4E0 \uB178\uD2B8\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?", onClose: () => setShowDeleteConfirm(false), onConfirm: handleDeleteAllNotes, children: [_jsxs("p", { className: "text-sm text-gray-300 mb-4", children: ["\uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC73C\uBA70 \uBAA8\uB4E0 \uB178\uD2B8\uC640 \uAD00\uB828 \uB370\uC774\uD130\uB97C \uC601\uAD6C\uC801\uC73C\uB85C \uC0AD\uC81C\uD569\uB2C8\uB2E4. \uACC4\uC18D\uD558\uB824\uBA74 \uC544\uB798\uC5D0 \"", _jsx("strong", { className: 'text-red-400', children: "delete all my notes" }), "\"\uB97C \uC785\uB825\uD558\uC138\uC694."] }), _jsx("input", { type: "text", value: confirmText, onChange: (e) => setConfirmText(e.target.value), className: "w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-red-500 focus:border-red-500 transition-colors text-white", placeholder: 'delete all my notes' })] }))] }));
};
export default Settings;

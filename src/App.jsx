import React, { useState, useEffect, useCallback } from "react";

function App() {
    const [sourceDir, setSourceDir] = useState("");
    const [classificationDir, setClassificationDir] = useState(""); // 분류 완료된 폴더
    const [labels, setLabels] = useState([]);
    const [images, setImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isConfigured, setIsConfigured] = useState(false);
    const [error, setError] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [electronApiReady, setElectronApiReady] = useState(false);
    const [history, setHistory] = useState([]);
    const [isMaximized, setIsMaximized] = useState(false);

    const currentImage = images[currentIndex];

    // Check if Electron API is available
    useEffect(() => {
        const checkElectronAPI = () => {
            // Check for direct ipcRenderer access (nodeIntegration: true)
            if (window.require) {
                const { ipcRenderer } = window.require("electron");
                if (ipcRenderer) {
                    window.electronAPI = {
                        selectDirectory: () => ipcRenderer.invoke("select-directory"),
                        getImages: (dirPath) => ipcRenderer.invoke("get-images", dirPath),
                        moveFile: (sourcePath, targetDir, category) => ipcRenderer.invoke("move-file", sourcePath, targetDir, category),
                        ensureDirectories: (normalDir, abnormalDir) => ipcRenderer.invoke("ensure-directories", normalDir, abnormalDir),
                        ensureDirectory: (dirPath) => ipcRenderer.invoke("ensure-directory", dirPath),
                        windowMinimize: () => ipcRenderer.invoke("window-minimize"),
                        windowMaximize: () => ipcRenderer.invoke("window-maximize"),
                        windowClose: () => ipcRenderer.invoke("window-close"),
                        windowIsMaximized: () => ipcRenderer.invoke("window-is-maximized"),
                    };
                    setElectronApiReady(true);
                    console.log("Electron API created via direct ipcRenderer access");
                    return;
                }
            }

            // Fallback to preload-exposed API
            if (window.electronAPI && window.electronAPI.selectDirectory) {
                setElectronApiReady(true);
                console.log("Electron API ready via preload");
            } else {
                console.warn("Electron API not available, retrying...");
                setTimeout(checkElectronAPI, 50);
            }
        };

        checkElectronAPI();
    }, []);

    const selectSourceDirectory = async () => {
        try {
            setError("");
            console.log("Attempting to select source directory...");

            if (!window.electronAPI || !window.electronAPI.selectDirectory) {
                setError("전자 API를 사용할 수 없습니다");
                return;
            }

            const dir = await window.electronAPI.selectDirectory();
            console.log("Directory selection result:", dir);

            if (dir) {
                setSourceDir(dir);
                setError("");
                console.log("Source directory set to:", dir);
            } else {
                console.log("No directory was selected");
            }
        } catch (err) {
            console.error("Error selecting source directory:", err);
            setError(`소스 디렉토리 선택 실패: ${err.message}`);
        }
    };

    const selectClassificationDirectory = async () => {
        try {
            setError("");
            console.log("Attempting to select classification directory...");

            if (!window.electronAPI || !window.electronAPI.selectDirectory) {
                setError("전자 API를 사용할 수 없습니다");
                return;
            }

            const dir = await window.electronAPI.selectDirectory();
            console.log("Classification directory selection result:", dir);

            if (dir) {
                setClassificationDir(dir);
                setError("");
                console.log("Classification directory set to:", dir);

                // 기존 라벨들의 디렉토리 경로를 업데이트
                const updatedLabels = labels.map((label) => ({
                    ...label,
                    directory: `${dir}\\${label.name || "Untitled"}`,
                }));
                setLabels(updatedLabels);
            } else {
                console.log("No directory was selected");
            }
        } catch (err) {
            console.error("Error selecting classification directory:", err);
            setError(`분류 디렉토리 선택 실패: ${err.message}`);
        }
    };

    const addLabel = () => {
        if (labels.length >= 10) {
            setError("최대 10개의 라벨만 허용됩니다 (0-9)");
            return;
        }

        const newLabel = {
            key: labels.length.toString(),
            name: "",
            directory: classificationDir ? `${classificationDir}\\Untitled` : "",
            color: getRandomColor(),
        };

        const newLabels = [...labels, newLabel];
        setLabels(newLabels);
    };

    const removeLabel = (index) => {
        const newLabels = labels.filter((_, i) => i !== index);
        // 키를 다시 할당 (0부터 순서대로)
        const updatedLabels = newLabels.map((label, i) => ({
            ...label,
            key: i.toString(),
        }));
        setLabels(updatedLabels);
    };

    const updateLabelName = (index, name) => {
        const updatedLabels = [...labels];
        updatedLabels[index] = {
            ...updatedLabels[index],
            name,
            directory: classificationDir ? `${classificationDir}\\${name || "Untitled"}` : "",
        };
        setLabels(updatedLabels);
    };

    const getRandomColor = () => {
        const colors = ["#28a745", "#dc3545", "#007bff", "#ffc107", "#6f42c1", "#fd7e14", "#20c997", "#e83e8c", "#6c757d", "#17a2b8"];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const loadImages = async () => {
        if (!sourceDir) return;

        try {
            setError("");
            const imageList = await window.electronAPI.getImages(sourceDir);
            setImages(imageList);
            setCurrentIndex(0);

            if (imageList.length === 0) {
                setError("선택된 디렉토리에서 이미지를 찾을 수 없습니다");
            }
        } catch (err) {
            setError("디렉토리에서 이미지 로드 실패");
        }
    };

    const startClassification = async () => {
        if (!sourceDir) {
            setError("소스 디렉토리를 선택해주세요");
            return;
        }

        if (!classificationDir) {
            setError("분류 디렉토리를 선택해주세요");
            return;
        }

        if (labels.length === 0) {
            setError("최소 하나의 라벨을 추가해주세요");
            return;
        }

        // 모든 라벨에 이름이 설정되었는지 확인
        const invalidLabels = labels.filter((label) => !label.name.trim());
        if (invalidLabels.length > 0) {
            setError("모든 라벨에 이름을 설정해주세요");
            return;
        }

        try {
            setError("");
            // 분류 폴더 확인 및 각 라벨별 하위 폴더 생성
            await window.electronAPI.ensureDirectory(classificationDir);

            for (const label of labels) {
                const labelDir = `${classificationDir}\\${label.name}`;
                await window.electronAPI.ensureDirectory(labelDir);
                console.log(`Created directory for label "${label.name}": ${labelDir}`);
            }

            await loadImages();
            setIsConfigured(true);
        } catch (err) {
            setError("분류 시작 실패: " + err.message);
        }
    };

    const moveToNext = () => {
        if (currentIndex < images.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const moveToPrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const undoLastClassification = async () => {
        if (history.length === 0 || isProcessing) return;

        const lastAction = history[history.length - 1];
        setIsProcessing(true);

        try {
            // 파일을 원래 소스 디렉토리로 되돌리기
            const result = await window.electronAPI.moveFile(`${lastAction.targetDir}\\${lastAction.imagePath.split("\\").pop()}`, sourceDir, "undo");

            if (result.success) {
                // 이미지 리스트에 다시 추가
                const newImages = [...images];
                newImages.splice(lastAction.originalIndex, 0, lastAction.imagePath);
                setImages(newImages);

                // 인덱스 조정
                setCurrentIndex(lastAction.originalIndex);

                // 히스토리에서 제거
                setHistory((prev) => prev.slice(0, -1));

                setError("");
                console.log(`Undo successful: Image returned to source directory`);
            } else {
                setError(`실행 취소 실패: ${result.error}`);
            }
        } catch (err) {
            setError("실행 취소 실패: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const classifyImage = async (labelIndex) => {
        if (!currentImage || isProcessing || labelIndex >= labels.length) return;

        const label = labels[labelIndex];
        if (!label || !label.name) return;

        setIsProcessing(true);
        try {
            // 라벨 이름으로 하위 폴더 경로 생성
            const targetDir = `${classificationDir}\\${label.name}`;
            const result = await window.electronAPI.moveFile(currentImage, targetDir, label.name);

            if (result.success) {
                // 히스토리에 현재 작업 저장
                const historyItem = {
                    imagePath: currentImage,
                    originalIndex: currentIndex,
                    targetDir: targetDir,
                    labelName: label.name,
                    timestamp: Date.now(),
                };
                setHistory((prev) => [...prev, historyItem]);

                // Remove the classified image from the list
                const newImages = images.filter((_, index) => index !== currentIndex);
                setImages(newImages);

                // Adjust current index if necessary
                if (currentIndex >= newImages.length && newImages.length > 0) {
                    setCurrentIndex(newImages.length - 1);
                } else if (newImages.length === 0) {
                    setCurrentIndex(0);
                }

                setError("");
                console.log(`Image moved to: ${targetDir}`);
            } else {
                setError(`이미지 이동 실패: ${result.error}`);
            }
        } catch (err) {
            setError("이미지 분류 실패: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyPress = useCallback(
        (event) => {
            if (!isConfigured || isProcessing) return;

            // Ctrl+Z 실행 취소
            if (event.ctrlKey && event.key.toLowerCase() === "z") {
                event.preventDefault();
                undoLastClassification();
                return;
            }

            switch (event.key) {
                case "ArrowLeft":
                    moveToPrevious();
                    break;
                case "ArrowRight":
                    moveToNext();
                    break;
                case "0":
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                case "6":
                case "7":
                case "8":
                case "9":
                    const keyIndex = parseInt(event.key);
                    if (keyIndex < labels.length) {
                        classifyImage(keyIndex);
                    }
                    break;
                default:
                    break;
            }
        },
        [isConfigured, isProcessing, currentIndex, currentImage, labels, history]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyPress);
        return () => {
            window.removeEventListener("keydown", handleKeyPress);
        };
    }, [handleKeyPress]);

    const resetConfiguration = () => {
        setIsConfigured(false);
        setImages([]);
        setCurrentIndex(0);
        setError("");
        setHistory([]);
    };

    // 창 제어 함수들
    const handleMinimize = async () => {
        if (window.electronAPI?.windowMinimize) {
            await window.electronAPI.windowMinimize();
        }
    };

    const handleMaximize = async () => {
        if (window.electronAPI?.windowMaximize) {
            await window.electronAPI.windowMaximize();
            // 최대화 상태 업데이트
            if (window.electronAPI?.windowIsMaximized) {
                const maximized = await window.electronAPI.windowIsMaximized();
                setIsMaximized(maximized);
            }
        }
    };

    const handleClose = async () => {
        if (window.electronAPI?.windowClose) {
            await window.electronAPI.windowClose();
        }
    };

    // 초기 최대화 상태 확인
    useEffect(() => {
        const checkMaximized = async () => {
            if (window.electronAPI?.windowIsMaximized) {
                const maximized = await window.electronAPI.windowIsMaximized();
                setIsMaximized(maximized);
            }
        };

        if (electronApiReady) {
            checkMaximized();
        }
    }, [electronApiReady]);

    if (!isConfigured) {
        return (
            <div className="app">
                <div className="custom-titlebar">
                    <div className="titlebar-drag-region">
                        <div className="titlebar-title">
                            <img src="/iCK_color.svg" alt="iCK" className="titlebar-logo" />
                            <span>iCK! - image Classification by Keys!</span>
                        </div>
                    </div>
                    <div className="titlebar-controls">
                        <button className="titlebar-button minimize" onClick={handleMinimize} title="최소화">
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <rect x="0" y="6" width="12" height="1" fill="currentColor" />
                            </svg>
                        </button>
                        <button className="titlebar-button maximize" onClick={handleMaximize} title={isMaximized ? "복원" : "최대화"}>
                            {isMaximized ? (
                                <svg width="12" height="12" viewBox="0 0 12 12">
                                    <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
                                    <rect x="0" y="0" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
                                </svg>
                            ) : (
                                <svg width="12" height="12" viewBox="0 0 12 12">
                                    <rect x="0" y="0" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1" />
                                </svg>
                            )}
                        </button>
                        <button className="titlebar-button close" onClick={handleClose} title="닫기">
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <line x1="0" y1="0" x2="12" y2="12" stroke="currentColor" strokeWidth="1" />
                                <line x1="12" y1="0" x2="0" y2="12" stroke="currentColor" strokeWidth="1" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="setup-screen">
                    <div className="keyboard-shortcuts">
                        <h3>키보드 단축키</h3>
                        <div className="shortcut-item">
                            <span>이전 이미지:</span>
                            <span className="shortcut-key">←</span>
                        </div>
                        <div className="shortcut-item">
                            <span>다음 이미지:</span>
                            <span className="shortcut-key">→</span>
                        </div>
                        <div className="shortcut-item">
                            <span>실행 취소:</span>
                            <span className="shortcut-key">Ctrl+Z</span>
                        </div>
                        {labels.map((label, index) => (
                            <div key={index} className="shortcut-item">
                                <span>{label.name || `라벨 ${index}`}:</span>
                                <span className="shortcut-key" style={{ backgroundColor: label.color }}>
                                    {index}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="setup-card">
                        <h2>설정</h2>

                        <div className="setup-item">
                            <label>소스 디렉토리 (분류할 이미지들):</label>
                            <div className={`path-display ${!sourceDir ? "empty" : ""}`}>{sourceDir || "디렉토리가 선택되지 않음"}</div>
                            <button className="button" onClick={selectSourceDirectory}>
                                소스 디렉토리 선택
                            </button>
                        </div>

                        <div className="setup-item">
                            <label>분류 디렉토리 (분류된 이미지가 저장될 곳):</label>
                            <div className={`path-display ${!classificationDir ? "empty" : ""}`}>{classificationDir || "디렉토리가 선택되지 않음"}</div>
                            {classificationDir && <div style={{ fontSize: "12px", color: "#7e848dff", marginBottom: "8px" }}>라벨 폴더가 이 디렉토리 안에 자동으로 생성됩니다</div>}
                            <button className="button" onClick={selectClassificationDirectory}>
                                분류 디렉토리 선택
                            </button>
                        </div>

                        <div className="setup-item">
                            <div className="labels-header">
                                <label>라벨 (0-9 키):</label>
                                <button className="button" onClick={addLabel} disabled={labels.length >= 10}>
                                    라벨 추가 ({labels.length}/10)
                                </button>
                            </div>

                            <div className="labels-list">
                                {labels.map((label, index) => (
                                    <div key={index} className="label-config">
                                        <div className="label-header">
                                            <span className="label-key" style={{ backgroundColor: label.color }}>
                                                {index}
                                            </span>
                                            <input type="text" placeholder="라벨 이름" value={label.name} onChange={(e) => updateLabelName(index, e.target.value)} className="label-name-input" />
                                            <button className="button small danger" onClick={() => removeLabel(index)}>
                                                삭제
                                            </button>
                                        </div>
                                        {classificationDir && label.name && (
                                            <div className="path-display" style={{ fontSize: "11px", color: "#28a745" }}>
                                                → {classificationDir}\\{label.name}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {labels.length === 0 && <div className="empty-labels">라벨이 설정되지 않았습니다. 분류를 시작하려면 라벨을 추가하세요.</div>}
                            </div>
                        </div>

                        <button className="button" onClick={startClassification} disabled={!sourceDir || !classificationDir || labels.length === 0}>
                            분류 시작
                        </button>

                        {error && <div className="error-message">{error}</div>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <div className="custom-titlebar">
                <div className="titlebar-drag-region">
                    <div className="titlebar-title">
                        <img src="/iCK_color.svg" alt="iCK" className="titlebar-logo" />
                        <span>iCK! - image Classification by Keys!</span>
                    </div>
                </div>
                <div className="titlebar-controls">
                    <button className="titlebar-button minimize" onClick={handleMinimize} title="최소화">
                        <svg width="12" height="12" viewBox="0 0 12 12">
                            <rect x="0" y="6" width="12" height="1" fill="currentColor" />
                        </svg>
                    </button>
                    <button className="titlebar-button maximize" onClick={handleMaximize} title={isMaximized ? "복원" : "최대화"}>
                        {isMaximized ? (
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
                                <rect x="0" y="0" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
                            </svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <rect x="0" y="0" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1" />
                            </svg>
                        )}
                    </button>
                    <button className="titlebar-button close" onClick={handleClose} title="닫기">
                        <svg width="12" height="12" viewBox="0 0 12 12">
                            <line x1="0" y1="0" x2="12" y2="12" stroke="currentColor" strokeWidth="1" />
                            <line x1="12" y1="0" x2="0" y2="12" stroke="currentColor" strokeWidth="1" />
                        </svg>
                    </button>
                </div>
            </div>
            <header className="header">
                <div className="header-content">
                    <div className="header-controls">
                        <span className="status-text">{images.length > 0 ? `이미지 ${currentIndex + 1} / ${images.length}` : "남은 이미지 없음"}</span>
                        <button className="button" onClick={resetConfiguration}>
                            설정 화면으로
                        </button>
                    </div>
                </div>
            </header>

            <div className="main-content">
                <div className="image-container">{currentImage ? <img src={`file://${currentImage}`} alt="Current image" className="image-display" /> : <div className="no-image">{images.length === 0 ? "모든 이미지가 분류되었습니다!" : "표시할 이미지가 없습니다"}</div>}</div>

                <div className="controls-bar">
                    <div className="navigation-controls">
                        <button className="button" onClick={moveToPrevious} disabled={currentIndex === 0 || images.length === 0}>
                            ← 이전
                        </button>
                        <button className="button" onClick={moveToNext} disabled={currentIndex >= images.length - 1 || images.length === 0}>
                            다음 →
                        </button>
                        <button className="button" onClick={undoLastClassification} disabled={history.length === 0 || isProcessing}>
                            ↺ 실행 취소 (Ctrl+Z)
                        </button>
                    </div>

                    <div className="image-info">
                        {currentImage && (
                            <>
                                <span>{currentImage.split("\\").pop()}</span>

                                <span>{images.length > 0 ? `${currentIndex + 1} / ${images.length}` : "남은 이미지 없음"}</span>
                            </>
                        )}
                    </div>

                    <div className="classification-controls">
                        {labels.map((label, index) => (
                            <button key={index} className="button classification-btn" style={{ backgroundColor: label.color }} onClick={() => classifyImage(index)} disabled={!currentImage || isProcessing}>
                                {isProcessing ? "처리 중..." : `${index} - ${label.name}`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-message" style={{ position: "fixed", top: "70px", right: "20px", zIndex: 1000 }}>
                    {error}
                </div>
            )}
        </div>
    );
}

export default App;

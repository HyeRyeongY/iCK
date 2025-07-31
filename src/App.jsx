import React, { useState, useEffect, useCallback } from "react";

function App() {
    const [sourceDir, setSourceDir] = useState("");
    const [classificationDir, setClassificationDir] = useState(""); // 분류 완료된 폴더
    const [labels, setLabels] = useState([]);
    const [images, setImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isConfigured, setIsConfigured] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [electronApiReady, setElectronApiReady] = useState(false);
    const [history, setHistory] = useState([]);
    const [isMaximized, setIsMaximized] = useState(false);
    const [imageZoom, setImageZoom] = useState(1);
    const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

    const currentImage = images[currentIndex];

    // localStorage 키
    const STORAGE_KEY = "iCK_settings";

    // 설정 저장 함수
    const saveSettings = useCallback(() => {
        const settings = {
            sourceDir,
            classificationDir,
            labels,
            timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [sourceDir, classificationDir, labels]);

    // 설정 불러오기 함수
    const loadSettings = useCallback(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.sourceDir) setSourceDir(settings.sourceDir);
                if (settings.classificationDir) setClassificationDir(settings.classificationDir);
                if (settings.labels && Array.isArray(settings.labels)) {
                    setLabels(settings.labels);
                }
                console.log("Settings loaded from localStorage");

                // 설정이 복원되었음을 사용자에게 알림
                if (settings.sourceDir || settings.classificationDir || (settings.labels && settings.labels.length > 0)) {
                    setSuccessMessage("이전 작업 설정이 복원되었습니다.");
                    setTimeout(() => setSuccessMessage(""), 3000);
                }
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
        }
    }, []);

    // 이미지가 변경될 때 줌과 위치 리셋
    useEffect(() => {
        setImageZoom(1);
        setImagePosition({ x: 0, y: 0 });
    }, [currentImage]);

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
                case "ArrowUp":
                    if (currentImage) {
                        event.preventDefault();
                        handleZoom(1);
                    }
                    break;
                case "ArrowDown":
                    if (currentImage) {
                        event.preventDefault();
                        handleZoom(-1);
                    }
                    break;
                case "r":
                case "R":
                    if (currentImage) {
                        event.preventDefault();
                        resetZoom();
                    }
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
        // 저장된 설정은 유지하되, 분류 상태만 리셋
    };

    const clearAllSettings = () => {
        localStorage.removeItem(STORAGE_KEY);
        setSourceDir("");
        setClassificationDir("");
        setLabels([]);
        setIsConfigured(false);
        setImages([]);
        setCurrentIndex(0);
        setError("");
        setHistory([]);
        console.log("All settings cleared");
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

    // 이미지 줌 기능
    const handleZoom = (delta) => {
        const zoomStep = delta > 0 ? 0.1 : -0.1;
        const newZoom = Math.max(0.1, Math.min(5, imageZoom + zoomStep));
        setImageZoom(newZoom);
    };

    const resetZoom = () => {
        setImageZoom(1);
        setImagePosition({ x: 0, y: 0 });
    };

    // 마우스 휠 이벤트 핸들러
    const handleWheel = useCallback(
        (event) => {
            if (!currentImage) return;
            event.preventDefault();
            const zoomDirection = event.deltaY < 0 ? 1 : -1;
            handleZoom(zoomDirection);
        },
        [currentImage, imageZoom]
    );

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

    // 앱 시작 시 설정 불러오기
    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // 설정 변경 시 자동 저장
    useEffect(() => {
        if (sourceDir || classificationDir || labels.length > 0) {
            saveSettings();
        }
    }, [sourceDir, classificationDir, labels, saveSettings]);

    if (!isConfigured) {
        return (
            <div className="app">
                <div className="custom-titlebar">
                    <div className="titlebar-drag-region">
                        <div className="titlebar-title">
                            {/* <h1>iCK!</h1> */}
                            <svg className="titlebar-logo" width="68" height="31" viewBox="0 0 68 31" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M67.0899 8.7373C66.9386 10.3318 66.7873 11.9088 66.636 13.4683C66.4847 15.0279 66.3509 16.6282 66.2345 18.2692C66.2112 18.6533 66.1763 18.9151 66.1298 19.0548C66.0716 19.2061 65.9377 19.305 65.7282 19.3516C64.739 19.5494 63.7031 19.7531 62.6208 19.9626C61.5384 20.1837 60.4909 20.4631 59.4784 20.8006C59.4435 20.8122 59.3911 20.818 59.3213 20.818C59.1932 20.818 59.1292 20.7715 59.1292 20.6784L60.7004 3.67457C60.7353 3.2905 60.7761 3.02281 60.8226 2.87151C60.8692 2.73185 60.9972 2.63874 61.2067 2.59219C62.196 2.28959 63.1969 1.95207 64.2094 1.57964C65.222 1.20721 66.2927 0.828962 67.4216 0.444893C67.4565 0.433254 67.5089 0.427435 67.5788 0.427435C67.7068 0.427435 67.7708 0.485628 67.7708 0.602013C67.7708 0.613651 67.7591 0.770771 67.7359 1.07337C67.7126 1.37597 67.6835 1.76586 67.6486 2.24304C67.602 2.72021 67.5555 3.25558 67.5089 3.84915C67.4624 4.44271 67.4158 5.03627 67.3693 5.62983C67.3111 6.22339 67.2587 6.79368 67.2121 7.34068C67.1656 7.88769 67.1248 8.35323 67.0899 8.7373ZM65.7806 22.6685C65.7457 23.169 65.7224 23.5531 65.7108 23.8208C65.6875 24.0884 65.67 24.2863 65.6584 24.4143C65.6468 24.554 65.6409 24.6413 65.6409 24.6762C65.6409 24.7111 65.6409 24.7344 65.6409 24.746C65.6293 24.7693 65.6235 24.8042 65.6235 24.8508C65.6118 24.909 65.6002 25.0195 65.5886 25.1825C65.5769 25.357 65.5595 25.6073 65.5362 25.9331C65.5129 26.259 65.478 26.7071 65.4315 27.2774C65.4082 27.6614 65.3733 27.9233 65.3267 28.063C65.2685 28.2143 65.1347 28.3132 64.9252 28.3598C63.9359 28.5576 62.9001 28.7613 61.8177 28.9708C60.7353 29.1919 59.6879 29.4712 58.6753 29.8087C58.6404 29.8204 58.588 29.8262 58.5182 29.8262C58.4833 29.7564 58.4367 29.7098 58.3785 29.6865L58.3262 29.6516L58.7102 24.8682C58.7452 24.4841 58.7917 24.2165 58.8499 24.0652C58.8965 23.9139 59.0187 23.8208 59.2165 23.7858C60.2058 23.5996 61.2067 23.3959 62.2192 23.1748C63.2318 22.9537 64.3025 22.7326 65.4315 22.5114C65.4664 22.4998 65.5187 22.494 65.5886 22.494C65.7166 22.494 65.7806 22.5522 65.7806 22.6685Z" fill="white" />
                                <path d="M42.5095 4.24092C42.4862 4.41549 42.4629 4.69482 42.4397 5.07888C42.4164 5.45132 42.3815 5.88194 42.3349 6.37075C42.3 6.85957 42.2651 7.3833 42.2302 7.94195C42.1953 8.48896 42.1545 9.02432 42.108 9.54806C42.073 10.0601 42.0323 10.5315 41.9858 10.9621C41.9508 11.3928 41.9217 11.7361 41.8985 11.9921L42.7888 11.0843L45.2678 8.01178C45.5704 7.62771 45.873 7.25528 46.1756 6.89449C46.4782 6.52205 46.7459 6.19036 46.9787 5.8994C47.2231 5.5968 47.4209 5.34657 47.5722 5.14872C47.7235 4.95086 47.8108 4.8403 47.8341 4.81702L55.5853 4.17108C55.6086 4.15945 55.661 4.15363 55.7424 4.15363H55.8821C56.1498 4.15363 56.2836 4.22346 56.2836 4.36312C56.2836 4.44459 56.2429 4.54352 56.1614 4.6599C56.0916 4.76465 55.981 4.90431 55.8297 5.07888C55.6435 5.30002 55.37 5.62007 55.0092 6.03906C54.66 6.4464 54.276 6.9003 53.857 7.40076C53.438 7.88957 53.0016 8.40167 52.5477 8.93704C52.1054 9.46077 51.6922 9.94958 51.3082 10.4035C50.9241 10.8457 50.5924 11.2298 50.3131 11.5557C50.0454 11.8816 49.8766 12.0911 49.8068 12.1842L48.707 13.2316C47.9621 13.9416 47.0078 14.8261 45.8439 15.8852C46.2047 16.2576 46.5888 16.665 46.9961 17.1072C47.4151 17.5379 47.8108 17.9568 48.1832 18.3642C48.5673 18.7599 48.9106 19.1207 49.2132 19.4466C49.5275 19.7724 49.7603 20.0169 49.9116 20.1798L55.306 26.4296C55.3642 26.4995 55.4398 26.5577 55.5329 26.6042C55.626 26.6508 55.7192 26.6915 55.8123 26.7264C55.9054 26.7613 55.981 26.8021 56.0392 26.8486C56.109 26.8836 56.144 26.9301 56.144 26.9883C56.144 27.0581 56.0683 27.1687 55.917 27.32C55.8239 27.4131 55.6493 27.5528 55.3933 27.739C55.1372 27.9136 54.8346 28.1056 54.4855 28.3151C54.148 28.5246 53.7813 28.7399 53.3856 28.961C52.9899 29.1821 52.6059 29.38 52.2334 29.5546C51.8726 29.7408 51.5351 29.8921 51.2209 30.0085C50.9183 30.1249 50.6855 30.1831 50.5226 30.1831C50.2782 30.1831 50.0221 30.0725 49.7544 29.8514C49.4868 29.6419 49.1667 29.3218 48.7943 28.8912C48.4218 28.4489 47.9796 27.8903 47.4675 27.2152C46.9554 26.5402 46.3385 25.7488 45.617 24.841C45.198 24.3173 44.7906 23.8052 44.3949 23.3047C43.9992 22.7926 43.6268 22.3155 43.2776 21.8732C42.9285 21.4193 42.6084 21.0178 42.3175 20.6686C42.0381 20.3078 41.8054 20.0169 41.6191 19.7957C41.526 19.8888 41.4271 19.9819 41.3224 20.075C41.2176 20.1565 41.1187 20.2438 41.0256 20.3369L40.4146 27.8263C40.4029 27.931 40.3797 28.0358 40.3447 28.1405C40.3215 28.2453 40.2458 28.3209 40.1178 28.3675L35.1773 30.1481C35.0492 30.1947 34.8805 30.2529 34.671 30.3227C34.4615 30.3925 34.2578 30.4275 34.06 30.4275C33.8854 30.4275 33.7399 30.3809 33.6235 30.2878C33.5071 30.1947 33.4489 30.0259 33.4489 29.7815C33.5071 29.0949 33.577 28.2045 33.6584 27.1105C33.7515 26.0165 33.8447 24.7712 33.9378 23.3746C34.0425 21.9663 34.1473 20.4358 34.252 18.7832C34.3684 17.1189 34.4906 15.3731 34.6186 13.5459L35.1074 6.19618C35.1191 5.98669 35.1307 5.81211 35.1423 5.67245C35.154 5.53279 35.1714 5.4164 35.1947 5.32329C35.218 5.23019 35.2587 5.16035 35.3169 5.1138C35.3751 5.06725 35.4624 5.03233 35.5788 5.00905L41.6191 3.56007C41.7704 3.51351 41.9276 3.49023 42.0905 3.49023C42.2534 3.49023 42.364 3.54261 42.4222 3.64735C42.4804 3.74046 42.5095 3.93832 42.5095 4.24092Z" fill="white" />
                                <path d="M10.5968 17.4215C10.5968 16.1412 10.7481 14.9134 11.0507 13.7379C11.365 12.5508 11.8072 11.4451 12.3775 10.4209C12.9478 9.39675 13.6345 8.46567 14.4375 7.6277C15.2522 6.78973 16.16 6.07396 17.1609 5.4804C18.1618 4.8752 19.2442 4.40966 20.4081 4.08379C21.5835 3.75791 22.8172 3.59497 24.1091 3.59497C25.1333 3.59497 26.0294 3.6648 26.7976 3.80446C27.5774 3.93249 28.2524 4.10124 28.8227 4.31074C29.4046 4.50859 29.8876 4.72972 30.2717 4.97413C30.6674 5.21854 30.9932 5.45131 31.2493 5.67244C31.2377 5.67244 31.2318 5.71317 31.2318 5.79464C31.2318 5.96922 31.2435 6.28928 31.2667 6.75481C31.3017 7.22035 31.3366 7.73826 31.3715 8.30855C31.418 8.87883 31.453 9.46076 31.4762 10.0543C31.5112 10.6362 31.5286 11.1425 31.5286 11.5731C31.5286 11.643 31.5053 11.7244 31.4588 11.8175C31.4122 11.899 31.2958 11.9398 31.1096 11.9398C31.0049 11.9398 30.8769 11.9223 30.7256 11.8874C30.4812 11.8175 30.1727 11.6604 29.8003 11.416C29.4279 11.16 28.9914 10.8981 28.491 10.6304C28.0022 10.3511 27.4493 10.1067 26.8325 9.8972C26.2273 9.67607 25.5639 9.5655 24.8423 9.5655C23.888 9.5655 23.0209 9.75754 22.2411 10.1416C21.4613 10.514 20.7979 11.032 20.2509 11.6953C19.7039 12.3587 19.2791 13.1502 18.9765 14.0696C18.6739 14.9774 18.5226 15.9725 18.5226 17.0549C18.5226 18.0092 18.6274 18.9228 18.8369 19.7957C19.0464 20.657 19.3606 21.4135 19.7796 22.0652C20.2102 22.717 20.7398 23.2407 21.3682 23.6364C22.0083 24.0205 22.7474 24.2125 23.5854 24.2125C24.2488 24.2125 24.8365 24.1892 25.3486 24.1427C25.8607 24.0961 26.3379 24.0205 26.7801 23.9157C27.2224 23.811 27.653 23.6713 28.072 23.4967C28.5026 23.3222 28.9623 23.101 29.4511 22.8334C29.4744 22.8217 29.5326 22.8159 29.6257 22.8159C29.7072 22.8159 29.7596 22.8508 29.7828 22.9206C29.8178 22.9788 29.8352 23.1069 29.8352 23.3047V25.3996C29.8352 25.7837 29.8294 26.162 29.8178 26.5344C29.8178 26.8952 29.8119 27.2211 29.8003 27.512C29.8003 27.803 29.7945 28.0416 29.7828 28.2278C29.7828 28.4024 29.777 28.4897 29.7654 28.4897C29.23 28.8272 28.6539 29.1007 28.0371 29.3102C27.4319 29.5313 26.8034 29.7001 26.1516 29.8164C25.5115 29.9445 24.8656 30.0259 24.2138 30.0608C23.5621 30.1074 22.9336 30.1307 22.3284 30.1307C20.6874 30.1307 19.1511 29.8223 17.7196 29.2054C16.288 28.5769 15.0427 27.7041 13.9836 26.5868C12.9362 25.4695 12.1098 24.131 11.5046 22.5715C10.8994 21.0119 10.5968 19.2953 10.5968 17.4215Z" fill="white" />
                                <path d="M0.68085 21.8208C0.83215 20.2263 0.98345 18.6493 1.13475 17.0898C1.28605 15.5302 1.41989 13.9299 1.53628 12.2889C1.55955 11.9048 1.59447 11.643 1.64102 11.5033C1.69922 11.352 1.83306 11.2531 2.04255 11.2065C3.03182 11.0087 4.06764 10.805 5.15002 10.5955C6.2324 10.3744 7.27986 10.095 8.29241 9.75753C8.32732 9.7459 8.3797 9.74008 8.44953 9.74008C8.57755 9.74008 8.64156 9.78663 8.64156 9.87974L7.07037 26.8835C7.03545 27.2676 6.99472 27.5353 6.94816 27.6866C6.90161 27.8263 6.77359 27.9194 6.5641 27.9659C5.57483 28.2685 4.57392 28.606 3.56137 28.9785C2.54882 29.3509 1.47809 29.7291 0.349154 30.1132C0.314239 30.1249 0.261865 30.1307 0.192035 30.1307C0.0640116 30.1307 0 30.0725 0 29.9561C0 29.9445 0.0116385 29.7873 0.0349154 29.4847C0.0581923 29.1821 0.0872885 28.7922 0.122204 28.3151C0.168758 27.8379 0.215312 27.3025 0.261865 26.709C0.308419 26.1154 0.354973 25.5218 0.401527 24.9283C0.459719 24.3347 0.512093 23.7644 0.558646 23.2174C0.6052 22.6704 0.645935 22.2049 0.68085 21.8208ZM1.99018 7.88956C2.02509 7.38911 2.04837 7.00504 2.06001 6.73735C2.08329 6.46967 2.10074 6.27181 2.11238 6.14379C2.12402 6.00413 2.12984 5.91684 2.12984 5.88192C2.12984 5.84701 2.12984 5.82373 2.12984 5.81209C2.14148 5.78882 2.1473 5.7539 2.1473 5.70735C2.15894 5.64916 2.17057 5.53859 2.18221 5.37565C2.19385 5.20107 2.21131 4.95085 2.23459 4.62497C2.25786 4.29909 2.29278 3.85101 2.33933 3.28073C2.36261 2.89666 2.39752 2.63479 2.44408 2.49513C2.50227 2.34383 2.63611 2.2449 2.84561 2.19835C3.83487 2.0005 4.8707 1.79682 5.95308 1.58733C7.03545 1.3662 8.08292 1.08688 9.09546 0.749361C9.13038 0.737722 9.18275 0.731903 9.25258 0.731903C9.2875 0.801734 9.33405 0.848288 9.39224 0.871565L9.44462 0.90648L9.06055 5.68989C9.02563 6.07396 8.97908 6.34164 8.92089 6.49294C8.87433 6.64424 8.75213 6.73735 8.55427 6.77227C7.565 6.95848 6.5641 7.16216 5.55155 7.38329C4.539 7.60442 3.46826 7.82555 2.33933 8.04668C2.30442 8.05832 2.25204 8.06414 2.18221 8.06414C2.05419 8.06414 1.99018 8.00594 1.99018 7.88956Z" fill="white" />
                            </svg>
                            <span> - image Classification by Keys!</span>
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
                            <span>이전 이미지</span>
                            <span className="shortcut-key">←</span>
                        </div>
                        <div className="shortcut-item">
                            <span>다음 이미지</span>
                            <span className="shortcut-key">→</span>
                        </div>
                        <div className="shortcut-item">
                            <span>이미지 확대 (10%)</span>
                            <span className="shortcut-key">↑ / 휠업</span>
                        </div>
                        <div className="shortcut-item">
                            <span>이미지 축소 (10%)</span>
                            <span className="shortcut-key">↓ / 휠다운</span>
                        </div>
                        <div className="shortcut-item">
                            <span>리셋</span>
                            <span className="shortcut-key">R</span>
                        </div>
                        <div className="shortcut-item">
                            <span>실행 취소</span>
                            <span className="shortcut-key">Ctrl+Z</span>
                        </div>
                        {labels.map((label, index) => (
                            <div key={index} className="shortcut-item">
                                <span>{label.name || `라벨 ${index}`}</span>
                                <span className="shortcut-key" style={{ backgroundColor: label.color }}>
                                    {index}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="setup-card">
                        <div className="setup-card-header">
                            <h2>설정</h2>
                            {(sourceDir || classificationDir || labels.length > 0) && (
                                <button className="button" onClick={clearAllSettings} title="모든 설정을 초기화합니다">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                                    </svg>
                                    설정 초기화
                                </button>
                            )}
                        </div>

                        <div className="setup-item">
                            <label>소스 디렉토리 (분류할 이미지들):</label>
                            <div className={`path-display ${!sourceDir ? "empty" : ""}`}>{sourceDir || "디렉토리가 선택되지 않음"}</div>
                            <button className="button" onClick={selectSourceDirectory}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
                                </svg>
                                소스 디렉토리 선택
                            </button>
                        </div>

                        <div className="setup-item">
                            <label>분류 디렉토리 (분류된 이미지가 저장될 곳):</label>
                            <div className={`path-display ${!classificationDir ? "empty" : ""}`}>{classificationDir || "디렉토리가 선택되지 않음"}</div>
                            {classificationDir && <div style={{ fontSize: "12px", color: "#7e848dff", marginBottom: "8px" }}>라벨 폴더가 이 디렉토리 안에 자동으로 생성됩니다</div>}
                            <button className="button" onClick={selectClassificationDirectory}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
                                </svg>
                                분류 디렉토리 선택
                            </button>
                        </div>

                        <div className="setup-item">
                            <div className="labels-header">
                                <label>라벨 (0-9 키):</label>
                                <button className="button" onClick={addLabel} disabled={labels.length >= 10}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                    </svg>
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
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                                </svg>
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

                                {labels.length === 0 && (
                                    <div className="empty-labels">
                                        라벨이 설정되지 않았습니다.
                                        <br /> 분류를 시작하려면 라벨을 추가하세요.
                                    </div>
                                )}
                            </div>
                        </div>

                        <button className="button" onClick={startClassification} disabled={!sourceDir || !classificationDir || labels.length === 0}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            분류 시작
                        </button>

                        {error && <div className="error-message">{error}</div>}
                        {successMessage && <div className="success-message">{successMessage}</div>}
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
                        {/* <h1>iCK!</h1> */}
                        <svg className="titlebar-logo" width="68" height="31" viewBox="0 0 68 31" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M67.0899 8.7373C66.9386 10.3318 66.7873 11.9088 66.636 13.4683C66.4847 15.0279 66.3509 16.6282 66.2345 18.2692C66.2112 18.6533 66.1763 18.9151 66.1298 19.0548C66.0716 19.2061 65.9377 19.305 65.7282 19.3516C64.739 19.5494 63.7031 19.7531 62.6208 19.9626C61.5384 20.1837 60.4909 20.4631 59.4784 20.8006C59.4435 20.8122 59.3911 20.818 59.3213 20.818C59.1932 20.818 59.1292 20.7715 59.1292 20.6784L60.7004 3.67457C60.7353 3.2905 60.7761 3.02281 60.8226 2.87151C60.8692 2.73185 60.9972 2.63874 61.2067 2.59219C62.196 2.28959 63.1969 1.95207 64.2094 1.57964C65.222 1.20721 66.2927 0.828962 67.4216 0.444893C67.4565 0.433254 67.5089 0.427435 67.5788 0.427435C67.7068 0.427435 67.7708 0.485628 67.7708 0.602013C67.7708 0.613651 67.7591 0.770771 67.7359 1.07337C67.7126 1.37597 67.6835 1.76586 67.6486 2.24304C67.602 2.72021 67.5555 3.25558 67.5089 3.84915C67.4624 4.44271 67.4158 5.03627 67.3693 5.62983C67.3111 6.22339 67.2587 6.79368 67.2121 7.34068C67.1656 7.88769 67.1248 8.35323 67.0899 8.7373ZM65.7806 22.6685C65.7457 23.169 65.7224 23.5531 65.7108 23.8208C65.6875 24.0884 65.67 24.2863 65.6584 24.4143C65.6468 24.554 65.6409 24.6413 65.6409 24.6762C65.6409 24.7111 65.6409 24.7344 65.6409 24.746C65.6293 24.7693 65.6235 24.8042 65.6235 24.8508C65.6118 24.909 65.6002 25.0195 65.5886 25.1825C65.5769 25.357 65.5595 25.6073 65.5362 25.9331C65.5129 26.259 65.478 26.7071 65.4315 27.2774C65.4082 27.6614 65.3733 27.9233 65.3267 28.063C65.2685 28.2143 65.1347 28.3132 64.9252 28.3598C63.9359 28.5576 62.9001 28.7613 61.8177 28.9708C60.7353 29.1919 59.6879 29.4712 58.6753 29.8087C58.6404 29.8204 58.588 29.8262 58.5182 29.8262C58.4833 29.7564 58.4367 29.7098 58.3785 29.6865L58.3262 29.6516L58.7102 24.8682C58.7452 24.4841 58.7917 24.2165 58.8499 24.0652C58.8965 23.9139 59.0187 23.8208 59.2165 23.7858C60.2058 23.5996 61.2067 23.3959 62.2192 23.1748C63.2318 22.9537 64.3025 22.7326 65.4315 22.5114C65.4664 22.4998 65.5187 22.494 65.5886 22.494C65.7166 22.494 65.7806 22.5522 65.7806 22.6685Z" fill="white" />
                            <path d="M42.5095 4.24092C42.4862 4.41549 42.4629 4.69482 42.4397 5.07888C42.4164 5.45132 42.3815 5.88194 42.3349 6.37075C42.3 6.85957 42.2651 7.3833 42.2302 7.94195C42.1953 8.48896 42.1545 9.02432 42.108 9.54806C42.073 10.0601 42.0323 10.5315 41.9858 10.9621C41.9508 11.3928 41.9217 11.7361 41.8985 11.9921L42.7888 11.0843L45.2678 8.01178C45.5704 7.62771 45.873 7.25528 46.1756 6.89449C46.4782 6.52205 46.7459 6.19036 46.9787 5.8994C47.2231 5.5968 47.4209 5.34657 47.5722 5.14872C47.7235 4.95086 47.8108 4.8403 47.8341 4.81702L55.5853 4.17108C55.6086 4.15945 55.661 4.15363 55.7424 4.15363H55.8821C56.1498 4.15363 56.2836 4.22346 56.2836 4.36312C56.2836 4.44459 56.2429 4.54352 56.1614 4.6599C56.0916 4.76465 55.981 4.90431 55.8297 5.07888C55.6435 5.30002 55.37 5.62007 55.0092 6.03906C54.66 6.4464 54.276 6.9003 53.857 7.40076C53.438 7.88957 53.0016 8.40167 52.5477 8.93704C52.1054 9.46077 51.6922 9.94958 51.3082 10.4035C50.9241 10.8457 50.5924 11.2298 50.3131 11.5557C50.0454 11.8816 49.8766 12.0911 49.8068 12.1842L48.707 13.2316C47.9621 13.9416 47.0078 14.8261 45.8439 15.8852C46.2047 16.2576 46.5888 16.665 46.9961 17.1072C47.4151 17.5379 47.8108 17.9568 48.1832 18.3642C48.5673 18.7599 48.9106 19.1207 49.2132 19.4466C49.5275 19.7724 49.7603 20.0169 49.9116 20.1798L55.306 26.4296C55.3642 26.4995 55.4398 26.5577 55.5329 26.6042C55.626 26.6508 55.7192 26.6915 55.8123 26.7264C55.9054 26.7613 55.981 26.8021 56.0392 26.8486C56.109 26.8836 56.144 26.9301 56.144 26.9883C56.144 27.0581 56.0683 27.1687 55.917 27.32C55.8239 27.4131 55.6493 27.5528 55.3933 27.739C55.1372 27.9136 54.8346 28.1056 54.4855 28.3151C54.148 28.5246 53.7813 28.7399 53.3856 28.961C52.9899 29.1821 52.6059 29.38 52.2334 29.5546C51.8726 29.7408 51.5351 29.8921 51.2209 30.0085C50.9183 30.1249 50.6855 30.1831 50.5226 30.1831C50.2782 30.1831 50.0221 30.0725 49.7544 29.8514C49.4868 29.6419 49.1667 29.3218 48.7943 28.8912C48.4218 28.4489 47.9796 27.8903 47.4675 27.2152C46.9554 26.5402 46.3385 25.7488 45.617 24.841C45.198 24.3173 44.7906 23.8052 44.3949 23.3047C43.9992 22.7926 43.6268 22.3155 43.2776 21.8732C42.9285 21.4193 42.6084 21.0178 42.3175 20.6686C42.0381 20.3078 41.8054 20.0169 41.6191 19.7957C41.526 19.8888 41.4271 19.9819 41.3224 20.075C41.2176 20.1565 41.1187 20.2438 41.0256 20.3369L40.4146 27.8263C40.4029 27.931 40.3797 28.0358 40.3447 28.1405C40.3215 28.2453 40.2458 28.3209 40.1178 28.3675L35.1773 30.1481C35.0492 30.1947 34.8805 30.2529 34.671 30.3227C34.4615 30.3925 34.2578 30.4275 34.06 30.4275C33.8854 30.4275 33.7399 30.3809 33.6235 30.2878C33.5071 30.1947 33.4489 30.0259 33.4489 29.7815C33.5071 29.0949 33.577 28.2045 33.6584 27.1105C33.7515 26.0165 33.8447 24.7712 33.9378 23.3746C34.0425 21.9663 34.1473 20.4358 34.252 18.7832C34.3684 17.1189 34.4906 15.3731 34.6186 13.5459L35.1074 6.19618C35.1191 5.98669 35.1307 5.81211 35.1423 5.67245C35.154 5.53279 35.1714 5.4164 35.1947 5.32329C35.218 5.23019 35.2587 5.16035 35.3169 5.1138C35.3751 5.06725 35.4624 5.03233 35.5788 5.00905L41.6191 3.56007C41.7704 3.51351 41.9276 3.49023 42.0905 3.49023C42.2534 3.49023 42.364 3.54261 42.4222 3.64735C42.4804 3.74046 42.5095 3.93832 42.5095 4.24092Z" fill="white" />
                            <path d="M10.5968 17.4215C10.5968 16.1412 10.7481 14.9134 11.0507 13.7379C11.365 12.5508 11.8072 11.4451 12.3775 10.4209C12.9478 9.39675 13.6345 8.46567 14.4375 7.6277C15.2522 6.78973 16.16 6.07396 17.1609 5.4804C18.1618 4.8752 19.2442 4.40966 20.4081 4.08379C21.5835 3.75791 22.8172 3.59497 24.1091 3.59497C25.1333 3.59497 26.0294 3.6648 26.7976 3.80446C27.5774 3.93249 28.2524 4.10124 28.8227 4.31074C29.4046 4.50859 29.8876 4.72972 30.2717 4.97413C30.6674 5.21854 30.9932 5.45131 31.2493 5.67244C31.2377 5.67244 31.2318 5.71317 31.2318 5.79464C31.2318 5.96922 31.2435 6.28928 31.2667 6.75481C31.3017 7.22035 31.3366 7.73826 31.3715 8.30855C31.418 8.87883 31.453 9.46076 31.4762 10.0543C31.5112 10.6362 31.5286 11.1425 31.5286 11.5731C31.5286 11.643 31.5053 11.7244 31.4588 11.8175C31.4122 11.899 31.2958 11.9398 31.1096 11.9398C31.0049 11.9398 30.8769 11.9223 30.7256 11.8874C30.4812 11.8175 30.1727 11.6604 29.8003 11.416C29.4279 11.16 28.9914 10.8981 28.491 10.6304C28.0022 10.3511 27.4493 10.1067 26.8325 9.8972C26.2273 9.67607 25.5639 9.5655 24.8423 9.5655C23.888 9.5655 23.0209 9.75754 22.2411 10.1416C21.4613 10.514 20.7979 11.032 20.2509 11.6953C19.7039 12.3587 19.2791 13.1502 18.9765 14.0696C18.6739 14.9774 18.5226 15.9725 18.5226 17.0549C18.5226 18.0092 18.6274 18.9228 18.8369 19.7957C19.0464 20.657 19.3606 21.4135 19.7796 22.0652C20.2102 22.717 20.7398 23.2407 21.3682 23.6364C22.0083 24.0205 22.7474 24.2125 23.5854 24.2125C24.2488 24.2125 24.8365 24.1892 25.3486 24.1427C25.8607 24.0961 26.3379 24.0205 26.7801 23.9157C27.2224 23.811 27.653 23.6713 28.072 23.4967C28.5026 23.3222 28.9623 23.101 29.4511 22.8334C29.4744 22.8217 29.5326 22.8159 29.6257 22.8159C29.7072 22.8159 29.7596 22.8508 29.7828 22.9206C29.8178 22.9788 29.8352 23.1069 29.8352 23.3047V25.3996C29.8352 25.7837 29.8294 26.162 29.8178 26.5344C29.8178 26.8952 29.8119 27.2211 29.8003 27.512C29.8003 27.803 29.7945 28.0416 29.7828 28.2278C29.7828 28.4024 29.777 28.4897 29.7654 28.4897C29.23 28.8272 28.6539 29.1007 28.0371 29.3102C27.4319 29.5313 26.8034 29.7001 26.1516 29.8164C25.5115 29.9445 24.8656 30.0259 24.2138 30.0608C23.5621 30.1074 22.9336 30.1307 22.3284 30.1307C20.6874 30.1307 19.1511 29.8223 17.7196 29.2054C16.288 28.5769 15.0427 27.7041 13.9836 26.5868C12.9362 25.4695 12.1098 24.131 11.5046 22.5715C10.8994 21.0119 10.5968 19.2953 10.5968 17.4215Z" fill="white" />
                            <path d="M0.68085 21.8208C0.83215 20.2263 0.98345 18.6493 1.13475 17.0898C1.28605 15.5302 1.41989 13.9299 1.53628 12.2889C1.55955 11.9048 1.59447 11.643 1.64102 11.5033C1.69922 11.352 1.83306 11.2531 2.04255 11.2065C3.03182 11.0087 4.06764 10.805 5.15002 10.5955C6.2324 10.3744 7.27986 10.095 8.29241 9.75753C8.32732 9.7459 8.3797 9.74008 8.44953 9.74008C8.57755 9.74008 8.64156 9.78663 8.64156 9.87974L7.07037 26.8835C7.03545 27.2676 6.99472 27.5353 6.94816 27.6866C6.90161 27.8263 6.77359 27.9194 6.5641 27.9659C5.57483 28.2685 4.57392 28.606 3.56137 28.9785C2.54882 29.3509 1.47809 29.7291 0.349154 30.1132C0.314239 30.1249 0.261865 30.1307 0.192035 30.1307C0.0640116 30.1307 0 30.0725 0 29.9561C0 29.9445 0.0116385 29.7873 0.0349154 29.4847C0.0581923 29.1821 0.0872885 28.7922 0.122204 28.3151C0.168758 27.8379 0.215312 27.3025 0.261865 26.709C0.308419 26.1154 0.354973 25.5218 0.401527 24.9283C0.459719 24.3347 0.512093 23.7644 0.558646 23.2174C0.6052 22.6704 0.645935 22.2049 0.68085 21.8208ZM1.99018 7.88956C2.02509 7.38911 2.04837 7.00504 2.06001 6.73735C2.08329 6.46967 2.10074 6.27181 2.11238 6.14379C2.12402 6.00413 2.12984 5.91684 2.12984 5.88192C2.12984 5.84701 2.12984 5.82373 2.12984 5.81209C2.14148 5.78882 2.1473 5.7539 2.1473 5.70735C2.15894 5.64916 2.17057 5.53859 2.18221 5.37565C2.19385 5.20107 2.21131 4.95085 2.23459 4.62497C2.25786 4.29909 2.29278 3.85101 2.33933 3.28073C2.36261 2.89666 2.39752 2.63479 2.44408 2.49513C2.50227 2.34383 2.63611 2.2449 2.84561 2.19835C3.83487 2.0005 4.8707 1.79682 5.95308 1.58733C7.03545 1.3662 8.08292 1.08688 9.09546 0.749361C9.13038 0.737722 9.18275 0.731903 9.25258 0.731903C9.2875 0.801734 9.33405 0.848288 9.39224 0.871565L9.44462 0.90648L9.06055 5.68989C9.02563 6.07396 8.97908 6.34164 8.92089 6.49294C8.87433 6.64424 8.75213 6.73735 8.55427 6.77227C7.565 6.95848 6.5641 7.16216 5.55155 7.38329C4.539 7.60442 3.46826 7.82555 2.33933 8.04668C2.30442 8.05832 2.25204 8.06414 2.18221 8.06414C2.05419 8.06414 1.99018 8.00594 1.99018 7.88956Z" fill="white" />
                        </svg>
                        <span> - image Classification by Keys!</span>
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
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                            설정 화면으로
                        </button>
                    </div>
                </div>
            </header>

            <div className="main-content">
                <div className="image-container" onWheel={handleWheel}>
                    {currentImage ? (
                        <div className="image-wrapper">
                            <img
                                src={`file://${currentImage}`}
                                alt="Current image"
                                className="image-display"
                                style={{
                                    transform: `scale(${imageZoom}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                                    transformOrigin: "center center",
                                }}
                            />
                            {imageZoom !== 1 && <div className="zoom-info">{Math.round(imageZoom * 100)}% (최대 500%, R키로 리셋)</div>}
                        </div>
                    ) : (
                        <div className="no-image">{images.length === 0 ? "모든 이미지가 분류되었습니다!" : "표시할 이미지가 없습니다"}</div>
                    )}
                </div>

                <div className="controls-bar">
                    <div className="navigation-controls">
                        <button className="button" onClick={moveToPrevious} disabled={currentIndex === 0 || images.length === 0}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                            </svg>
                            이전
                        </button>
                        <button className="button" onClick={moveToNext} disabled={currentIndex >= images.length - 1 || images.length === 0}>
                            다음
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                            </svg>
                        </button>
                        <button className="button" onClick={undoLastClassification} disabled={history.length === 0 || isProcessing}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
                            </svg>
                            실행 취소 (Ctrl+Z)
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

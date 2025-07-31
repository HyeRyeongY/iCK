# iCK! - image Classification by Keys!

**버전 1.1.0**

Electron과 React로 제작된 가벼운 이미지 분류 데스크톱 애플리케이션입니다.
키보드 단축키를 사용하여 빠르고 효율적으로 이미지를 분류할 수 있습니다.

## 주요 기능

- **다양한 이미지 포맷 지원** - JPEG, PNG, GIF, BMP, WebP
- **빠른 키보드 분류** - 화살표 키(← / →)로 이미지 탐색, 숫자 키(0-9)로 즉시 분류
- **커스텀 라벨** - 최대 10개의 개인화된 분류 카테고리 생성
- **자동 파일 이동** - 분류된 이미지를 지정된 폴더로 자동 이동
- **시각적 색상 코딩** - 각 라벨별 고유 색상으로 쉬운 식별
- **직관적 UI** - 깔끔하고 사용하기 쉬운 인터페이스
- **완전 오프라인** - 인터넷 연결 없이도 완전한 기능 사용
- **빠른 실행** - 설치 후 바로 사용 가능

## 설치 방법

### 일반 사용자용 (권장)

1. **[Releases](https://github.com/your-repo/ick/releases)** 페이지에서 최신 버전의 `iCK! Setup 1.1.0.exe` 다운로드
2. 다운로드한 exe 파일 실행하여 설치
3. **완전 오프라인 사용 가능** - 인터넷 연결 없이도 모든 기능 사용 가능
4. 설치 후 바로 사용 시작!

### 개발자용

#### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

#### Development Setup

1. 프로젝트 클론 또는 다운로드
2. 의존성 설치:
   ```bash
   npm install
   ```

3. 개발 모드로 실행:
   ```bash
   npm run electron-dev
   ```

#### Building for Production

Windows 실행 파일 빌드:

```bash
npm run dist:win
```

빌드된 실행 파일은 `dist` 폴더에 생성됩니다.

## 사용 방법

1. **애플리케이션 실행**
2. **설정 구성:**
   - 분류할 이미지가 있는 소스 디렉토리 선택
   - 분류된 이미지가 저장될 분류 디렉토리 선택
   - 커스텀 라벨 추가 (최대 10개) 및 개인화된 이름 설정
3. **분류 시작**
4. **키보드 단축키 사용:**
   - `←` / `→` - 이미지 간 탐색
   - `0` - `9` - 해당 라벨로 현재 이미지 분류 (지정된 폴더로 이동)

### 커스텀 라벨 생성

- "라벨 추가" 버튼을 클릭하여 새로운 분류 카테고리 생성
- 각 라벨에 대한 설명적인 이름 입력 (예: "강아지", "고양이", "자동차" 등)
- 각 라벨은 숫자 키(0-9)와 고유한 색상이 할당되어 쉽게 식별 가능
- 필요 없는 라벨은 "삭제" 버튼을 클릭하여 제거
- 라벨 이름에 따라 분류 디렉토리 내에 자동으로 하위 폴더 생성

## 시스템 요구사항

- **운영 체제**: Windows 10 이상
- **디스크 공간**: 약 200MB
- **메모리**: 최소 4GB RAM 권장
- **인터넷**: 설치 시에만 필요 (사용 시 불필요)

## 지원하는 이미지 포맷

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **GIF** (.gif)
- **BMP** (.bmp)
- **WebP** (.webp)

## Project Structure

```
ick/
├── public/
│   ├── electron.js      # Main Electron process
│   ├── preload.js       # IPC preload script
│   └── icon.ico         # Application icon
├── src/
│   ├── App.jsx          # Main React component
│   ├── main.jsx         # React entry point
│   └── index.css        # Application styles
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
└── index.html           # HTML template
```

## Development Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run electron` - Run Electron (after building)
- `npm run electron-dev` - Run in development mode
- `npm run dist` - Build and package application
- `npm run dist:win` - Build Windows executable

## 버전 히스토리

### v1.1.0 (현재)
- 오프라인 완전 지원
- 개선된 Electron 설정
- 안정성 향상

### v1.0.0
- 초기 릴리스
- 기본 이미지 분류 기능
- 커스텀 라벨 지원

# iCK! - image Classification by Keys!

**버전 1.1.1**

Electron과 React로 제작된 이미지 분류 데스크톱 애플리케이션입니다.
키보드 단축키를 사용하여 빠르고 효율적으로 이미지를 분류할 수 있습니다.

## 주요 기능

- **다양한 이미지 포맷 지원** - JPEG, PNG, GIF, BMP, WebP
- **빠른 키보드 분류** - 화살표 키로 이미지 탐색, 숫자 키(1-9, 0)로 즉시 분류
- **커스텀 라벨** - 최대 10개의 분류 카테고리 생성
- **자동 파일 이동** - 분류된 이미지를 지정된 폴더로 자동 이동
- **진행률 표시** - 실시간으로 분류 진행률 확인
- **축하 애니메이션** - 분류 완료 시 폭죽 효과
- **실행 취소** - Ctrl+Z로 마지막 분류 작업 취소
- **완전 오프라인** - 인터넷 연결 없이 완전한 기능 사용

## 설치 방법

### 일반 사용자용 (권장)

1. Releases 페이지에서 최신 버전의 `iCK! Setup 1.1.1.exe` 다운로드
2. 다운로드한 exe 파일 실행하여 설치
3. 설치 후 바로 사용 시작

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

1. **설정 구성:**
   - 소스 디렉토리: 분류할 이미지가 있는 폴더 선택
   - 분류 디렉토리: 분류된 이미지가 저장될 폴더 선택
   - 라벨 추가: 최대 10개의 분류 카테고리 생성

2. **분류 시작**

3. **키보드 단축키:**
   - `←` / `→` - 이미지 간 탐색
   - `1` - `9`, `0` - 해당 라벨로 현재 이미지 분류
   - `↑` / `↓` - 이미지 확대/축소
   - `R` - 이미지 줌 리셋
   - `Ctrl+Z` - 실행 취소

## 라벨 관리

- 라벨 추가 버튼으로 새로운 분류 카테고리 생성
- 각 라벨에 설명적인 이름 입력
- 라벨별 고유 색상이 자동으로 할당됨
- 삭제 버튼(-)으로 불필요한 라벨 제거
- 라벨 이름에 따라 분류 디렉토리 내에 하위 폴더 자동 생성

## 시스템 요구사항

- **운영 체제**: Windows 10 이상
- **디스크 공간**: 약 200MB
- **메모리**: 최소 4GB RAM 권장

## 지원하는 이미지 포맷

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- BMP (.bmp)
- WebP (.webp)

## Development Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run electron` - Run Electron (after building)
- `npm run electron-dev` - Run in development mode
- `npm run dist` - Build and package application
- `npm run dist:win` - Build Windows executable

## 버전 히스토리

### v1.1.1 (현재)
- 라벨 순서 개선 (1-9, 0 순서)
- 진행률 표시 기능 추가
- 축하 폭죽 애니메이션 추가
- UI/UX 개선 및 버그 수정

### v1.1.0
- 오프라인 완전 지원
- 개선된 Electron 설정
- 안정성 향상

### v1.0.0
- 초기 릴리스
- 기본 이미지 분류 기능
- 커스텀 라벨 지원
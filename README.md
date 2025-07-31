# iCK!

Electron과 React로 제작된 가벼운 이미지 분류 데스크톱 애플리케이션입니다.

## 기능

- 선택한 디렉토리에서 이미지 로드
- 화살표 키(← / →)를 사용한 이미지 탐색
- 최대 10개의 커스텀 라벨 생성 (개인화된 이름 설정 가능)
- 숫자 키(0-9)를 사용한 이미지 분류
- 분류된 이미지를 지정된 폴더로 자동 이동
- 쉬운 식별을 위한 시각적 색상 코딩 라벨
- 깔끔하고 직관적인 사용자 인터페이스
- Windows 실행 파일(.exe) 배포

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Development Setup

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run electron-dev
   ```

### Building for Production

To build a Windows executable:

```bash
npm run dist:win
```

The executable will be created in the `dist` folder.

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

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- BMP (.bmp)
- WebP (.webp)

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

## License

MIT License
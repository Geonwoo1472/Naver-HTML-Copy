document.getElementById('copyBtn').addEventListener('click', async () => {
  let htmlInput = document.getElementById('htmlInput').value;
  const statusDiv = document.getElementById('status');
  
  if (!htmlInput.trim()) {
    statusDiv.style.color = 'red';
    statusDiv.innerText = '텍스트를 입력해 주세요.';
    return;
  }

  // --- [1. AI 찌꺼기 완벽 청소] ---
  let text = htmlInput
    .replace(/\[cite:\s*\d+\]/g, '') // 각주 제거
    .replace(/출처 입력/g, '')         // 네이버 찌꺼기 제거
    .replace(/```html/gi, '')        // 코드블록 기호 제거
    .replace(/```markdown/gi, '')
    .replace(/```/g, '');

  // 제미나이 첨부파일 UI 찌꺼기 (PDF, + 1 등) 단독 줄 제거
  text = text.replace(/^PDF\s*$/gm, '');
  text = text.replace(/^\+\s*\d+\s*$/gm, '');

  // '다운로드 (5)_4.jpg' 같은 제미나이 이미지 파일명 찌꺼기 제거
  text = text.replace(/다운로드[^\n]{0,20}\.(jpg|png|jpeg|gif)\s*/gi, '');

  // 태그들이 같은 줄에 붙어 나오는 버그 방지 (앞에 엔터 강제 추가)
  // 예: "추천해요! [체크]" -> "추천해요!\n[체크]"
  text = text.replace(/([^\n])\s*(\[추천제목\]|\[제목\]|\[인용\]|\[구분선\]|\[체크\]|\[썸네일 사진\]|\[사진\])/g, '$1\n$2');

  // 독립적으로 존재해야 하는 태그 뒤에 바로 글씨가 붙어 나오는 버그 방지 (뒤에 엔터 강제 추가)
  // 예: "[사진]다이어트 식단을..." -> "[사진]\n다이어트 식단을..."
  text = text.replace(/(\[구분선\]|\[썸네일 사진\]|\[사진\])\s*([^\n])/g, '$1\n$2');

  // 제미나이가 링크나 해시태그를 인용구나 일반 텍스트 끝에 한 줄로 붙여버리는 현상 방지
  // 1) 링크 앞 강제 줄바꿈
  text = text.replace(/([^\n])\s*(https?:\/\/[^\s]+)/g, '$1\n$2');
  // 2) 해시태그 뭉치(3개 이상 연속) 앞 강제 줄바꿈
  text = text.replace(/([^\n])\s+(#[^\s#]+(?:\s+#[^\s#]+){2,})/g, '$1\n$2');

  
  text = text.trim();



  // --- [2. 괄호 태그 및 마크다운 -> 네이버 컴포넌트 자동 맵핑 엔진] ---
  let lines = text.split('\n');
  let htmlLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // 빈 줄 (단락 구분)
    if (line === '') {
      htmlLines.push('<p>&nbsp;</p>');
      continue;
    }

    // [추천제목] 또는 💡 추천 제목:
    if (line.startsWith('[추천제목]') || line.startsWith('💡 추천 제목:') || line.startsWith('💡 추천제목:')) {
      let titleText = line
        .replace(/^\[추천제목\]\s*/, '')
        .replace(/^💡 추천 제목:\s*/, '')
        .replace(/^💡 추천제목:\s*/, '');
      htmlLines.push(`<p style="font-size: 18px; font-weight: bold; color: #1ec800; background-color: #f0fdf4; padding: 10px; border-radius: 5px; margin-bottom: 20px;">💡 추천 제목: ${titleText}</p>`);
      continue;
    }

    // [제목] 또는 ## 또는 ■ (네이버 제목 블록으로 변환)
    if (line.startsWith('[제목]') || line.startsWith('## ') || line.startsWith('■ ')) {
      let title = line
        .replace(/^\[제목\]\s*/, '')
        .replace(/^##\s*/, '')
        .replace(/^■\s*/, '')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      htmlLines.push(`<h2>${title}</h2>`);
      continue;
    }

    // [인용] 또는 > (네이버 인용구 블록으로 변환)
    if (line.startsWith('[인용]') || line.startsWith('>')) {
      let quoteLines = [];
      while (i < lines.length && (
        lines[i].trim().startsWith('[인용]') || 
        lines[i].trim().startsWith('>')
      )) {
        let cleanQuote = lines[i].trim()
          .replace(/^\[인용\]\s*/, '')
          .replace(/^>\s*/, '')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        quoteLines.push(cleanQuote);
        i++;
      }
      i--;
      htmlLines.push(`<blockquote>${quoteLines.join('<br>')}</blockquote>`);
      continue;
    }

    // [구분선] 또는 --- (네이버 구분선 블록으로 변환)
    if (line === '[구분선]' || line === '---') {
      htmlLines.push(`<hr>`);
      continue;
    }

    // [체크] 또는 ✅ 또는 - (네이버 체크 리스트로 변환)
    if (line.startsWith('[체크]') || line.startsWith('✅') || line.startsWith('- ')) {
      let liText = line
        .replace(/^\[체크\]\s*/, '')
        .replace(/^[✅\-]\s*/, '')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      htmlLines.push(`<p style="font-size: 15px; font-weight: normal; font-style: normal;">✅ ${liText}</p>`);
      continue;
    }

    // [썸네일 사진], [사진] -> 이미지 자리표시자
    if (line === '[썸네일 사진]' || line === '[사진]') {
      htmlLines.push('<p style="font-size: 15px; font-weight: normal; color: #999; font-style: italic;">[📷 이미지 삽입 위치]</p>');
      continue;
    }

    // 일반 단락
    let pText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    htmlLines.push(`<p style="font-size: 15px; font-weight: normal; font-style: normal;">${pText}</p>`);
  }

  
  let finalHtml = htmlLines.join('\n');

  // --- [3. 크롬 다크모드 버그 방지용 래퍼 삭제] ---
  // 네이버 에디터는 div 래퍼가 있으면 블록을 분리하지 못하고 하나로 뭉개버립니다.
  // finalHtml = `<div style="...">...</div>` (삭제)


  try {
    const blob = new Blob([finalHtml], { type: 'text/html' });
    const data = [new ClipboardItem({ 'text/html': blob })];
    await navigator.clipboard.write(data);
    
    statusDiv.style.color = '#1ec800';
    statusDiv.innerText = '복사 완료! 네이버 에디터에서 Ctrl+V 하세요.';
  } catch (err) {
    console.error('클립보드 복사 실패:', err);
    statusDiv.style.color = 'red';
    statusDiv.innerText = '복사 실패: ' + err.message;
  }
});

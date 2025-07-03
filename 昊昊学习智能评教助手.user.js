// ==UserScript==
// @name         昊昊学习智能评教助手
// @namespace    http://tampermonkey.net/
// @version      3.9.1
// @description  根据页面URL自动显示课程列表或一键评教功能，支持平滑拖动面板、评教等级选择、默认评语，新增功能栏及返回功能，优化玻璃质感界面
// @author       LiuWenhao
// @match        http://222.24.62.52/pyxx/dcpg/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 优化后的样式，窗口靠右显示，新增空列表提示样式
    GM_addStyle(`
        .smart-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 360px;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(12px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            z-index: 9999;
            padding: 0;
            font-family: 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
            max-height: 80vh;
            overflow-y: auto;
        }
        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 16px;
            font-weight: 500;
            color: #fff;
            background: linear-gradient(135deg, #60a5fa, #93c5fd);
            padding: 12px 16px;
            border-radius: 10px 10px 0 0;
            cursor: move;
        }
        .close-btn {
            background: none;
            border: none;
            color: #fff;
            font-size: 18px;
            cursor: pointer;
            padding: 0 8px;
            transition: color 0.2s;
        }
        .close-btn:hover {
            color: #f0f4f8;
        }
        .panel-content {
            padding: 16px;
        }
        .action-btn {
            width: 100%;
            padding: 10px;
            background: #60a5fa;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            margin-top: 12px;
            transition: background 0.2s;
            font-family: 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
        }
        .action-btn:hover {
            background: #3b82f6;
        }
        .return-btn {
            background: #f87171;
        }
        .return-btn:hover {
            background: #ef4444;
        }
        .course-item {
            padding: 10px;
            margin: 6px 0;
            background: rgba(255, 255, 255, 0.7);
            border-radius: 6px;
            cursor: pointer;
            transition: transform 0.3s ease, background 0.2s;
            position: relative;
        }
        .course-item:hover {
            background: #dbeafe;
            transform: translateX(8px);
        }
        .course-name {
            font-weight: 500;
            color: #2563eb;
            font-size: 14px;
        }
        .teacher-name {
            color: #475569;
            font-size: 12px;
            margin-top: 4px;
        }
        .eval-select, .comment-textarea {
            width: 100%;
            box-sizing: border-box;
            padding: 10px;
            margin: 8px 0;
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 6px;
            font-size: 14px;
            background: rgba(255, 255, 255, 0.8);
            outline: none;
            font-family: 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
            transition: border-color 0.2s;
        }
        .eval-select:focus, .comment-textarea:focus {
            border-color: #60a5fa;
        }
        .comment-textarea {
            resize: vertical;
            min-height: 80px;
        }
        .label-text {
            font-size: 13px;
            color: #1f2937;
            margin-bottom: 6px;
            font-weight: 500;
            font-family: 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
        }
        .empty-message {
            text-align: center;
            font-size: 16px;
            color: #475569;
            padding: 20px;
            font-weight: 500;
        }
    `);

    // 页面类型检测
    function getPageType() {
        const url = window.location.href;
        if (url.includes('jxpjlist.aspx')) return 'list';
        if (url.includes('jxpj.aspx')) return 'evaluate';
        return 'unknown';
    }

    // 创建课程列表面板
    function createCourseListPanel() {
        const panel = document.createElement('div');
        panel.className = 'smart-panel';
        panel.innerHTML = `
            <div class="panel-header">
                待评教课程
                <button class="close-btn">×</button>
            </div>
            <div class="panel-content"></div>
        `;
        const content = panel.querySelector('.panel-content');
        const tbody = document.querySelector('#MainWork_dgData tbody');
        if (!tbody) {
            console.log('未找到课程表格，可能页面未加载完成');
            return;
        }
        const EVALUATION_COLUMN_INDEX = 5;
        const COURSE_ID_INDEX = 2;
        const COURSE_NAME_INDEX = 3;
        const TEACHER_NAME_INDEX = 4;

        let hasCourses = false;
        Array.from(tbody.rows).slice(1).forEach((row, index) => {
            const rowData = Array.from(row.cells).map(cell => cell.textContent.trim());
            if (rowData[EVALUATION_COLUMN_INDEX] === '未参加') {
                hasCourses = true;
                const item = document.createElement('div');
                item.className = 'course-item';
                item.innerHTML = `
                    <div class="course-name">[${rowData[COURSE_NAME_INDEX]}]</div>
                    <div class="teacher-name">${rowData[TEACHER_NAME_INDEX]}-${rowData[COURSE_ID_INDEX]}</div>
                `;
                item.addEventListener('click', () => {
                    const btn = row.querySelector('a[id*="MainWork_dgData_Linkbutton1_"]');
                    if (btn) {
                        console.log(`尝试点击按钮: ${btn.id}`);
                        btn.click();
                    } else {
                        console.log(`未找到按钮: MainWork_dgData_Linkbutton1_${index}`);
                    }
                });
                content.appendChild(item);
            }
        });

        // 如果没有待评教课程，显示提示
        if (!hasCourses) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = '当前无评教任务';
            content.appendChild(emptyMessage);
        }

        panel.querySelector('.close-btn').addEventListener('click', () => panel.remove());
        document.body.appendChild(panel);
        makeDraggable(panel);
    }

    // 创建评教面板
    function createEvaluationPanel() {
        const panel = document.createElement('div');
        panel.className = 'smart-panel';

        // 获取老师和课程信息
        const teacher = document.getElementById("MainWork_lbljsxm")?.innerHTML || '老师';
        const course = document.getElementById("MainWork_lblkcmc")?.innerHTML || '课程';

        panel.innerHTML = `
            <div class="panel-header">
                ${course}-${teacher}
                <button class="close-btn">×</button>
            </div>
            <div class="panel-content"></div>
        `;
        const content = panel.querySelector('.panel-content');

        // 检查是否已评教
        const submitButton = document.getElementById('MainWork_cmdAdd');
        if (!submitButton) {
            // 如果未找到提交按钮，说明已评教完成，显示提示并3秒后返回
            const completeMessage = document.createElement('div');
            completeMessage.className = 'empty-message';
            completeMessage.textContent = '评教已完成，即将返回...';
            content.appendChild(completeMessage);

            const returnBtn = document.createElement('button');
            returnBtn.className = 'action-btn return-btn';
            returnBtn.textContent = '立即返回';
            returnBtn.addEventListener('click', () => {
                window.location.href = 'jxpjlist.aspx';
            });
            content.appendChild(returnBtn);

            setTimeout(() => {
                window.location.href = 'jxpjlist.aspx';
            }, 3000);
        } else {
            // 添加评教等级选择
            const selectLabel = document.createElement('div');
            selectLabel.className = 'label-text';
            selectLabel.textContent = '评教等级：';
            const select = document.createElement('select');
            select.className = 'eval-select';
            const options = ['优', '良', '中', '差'];
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                if (opt === '优') option.selected = true;
                select.appendChild(option);
            });

            // 添加评语输入框
            const textareaLabel = document.createElement('div');
            textareaLabel.className = 'label-text';
            textareaLabel.textContent = `评教意见：`;
            const textarea = document.createElement('textarea');
            textarea.className = 'comment-textarea';
            textarea.value = `感谢${teacher}老师本学期的辛勤教学！${course}课程内容充实，讲解清晰，使我受益匪浅。`;

            // 添加一键填写按钮
            const autoFillBtn = document.createElement('button');
            autoFillBtn.className = 'action-btn';
            autoFillBtn.textContent = '一键填写评教';
            autoFillBtn.addEventListener('click', () => fillEvaluation(select.value, textarea.value.replace('${teacher}', teacher)));

            // 添加返回按钮
            const returnBtn = document.createElement('button');
            returnBtn.className = 'action-btn return-btn';
            returnBtn.textContent = '返回';
            returnBtn.addEventListener('click', () => {
                window.location.href = 'jxpjlist.aspx';
            });

            content.appendChild(selectLabel);
            content.appendChild(select);
content.appendChild(textareaLabel);
            content.appendChild(textarea);
            content.appendChild(autoFillBtn);
            content.appendChild(returnBtn);
        }

        panel.querySelector('.close-btn').addEventListener('click', () => panel.remove());
        document.body.appendChild(panel);
        makeDraggable(panel);
    }

    // 自动填写评教内容
    function fillEvaluation(level, customComment) {
        for (let i = 0; i <= 16; i++) {
            const item = document.getElementById(`MainWork_dgData_drppjjg_${i}`);
            if (item) item.value = level;
        }
        const textarea = document.getElementById("MainWork_txtpjyj");
        if (textarea) textarea.value = customComment;
        setTimeout(() => {
            const button = document.getElementById('MainWork_cmdAdd');
            if (button) {
                button.click();
            }
        }, 300); // 根据实际网络请求调整延迟时间
    }

    // 优化拖动效果，修复瞬移问题
    function makeDraggable(element) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        // 初始化位置
        element.style.position = 'fixedVirgin Media';
        element.style.right = '20px';
        element.style.top = '20px';
        element.style.left = 'auto';

        const header = element.querySelector('.panel-header');
        header.addEventListener('mousedown', startDragging);

        function startDragging(e) {
            if (e.button !== 0) return;
            const rect = element.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;
            isDragging = true;

            e.preventDefault();
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDragging);
        }

        function drag(e) {
            if (!isDragging) return;

            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            requestAnimationFrame(() => {
                element.style.left = `${currentX}px`;
                element.style.top = `${currentY}px`;
            });
        }

        function stopDragging() {
            isDragging = false;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDragging);
        }
    }

    // 主执行函数
    function main() {
        const pageType = getPageType();

        switch (pageType) {
            case 'list':
                createCourseListPanel();
                break;
            case 'evaluate':
                createEvaluationPanel();
                break;
            default:
                console.log('当前页面不需要特殊处理');
        }
    }

    window.addEventListener('load', function() {
        setTimeout(main, 100);
    });
})();
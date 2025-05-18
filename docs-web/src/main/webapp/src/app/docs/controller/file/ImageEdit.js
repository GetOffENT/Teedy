'use strict';

angular.module('docs').controller('ImageEdit', function ($scope, $uibModalInstance, file, Upload, $translate) {
  $scope.file = file;
  let canvas, ctx, img, angle = 0;
  let startX, startY, endX, endY, isSelecting = false, selectionRect = null;
  let historyStack = [];
  let isAdjusting = false;
  let adjustBackup = null;

  $scope.brightness = 1;
  $scope.contrast = 1;
  $scope.saturate = 1;

  $scope.init = function () {
    canvas = document.getElementById('imageEditorCanvas');
    ctx = canvas.getContext('2d');
    img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = `../api/file/${file.id}/data`;

    canvas.onmousedown = function(e) {
      isSelecting = true;
      const rect = canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      endX = startX;
      endY = startY;
      draw();
    };

    canvas.onmousemove = function(e) {
      if (!isSelecting) return;
      const rect = canvas.getBoundingClientRect();
      endX = e.clientX - rect.left;
      endY = e.clientY - rect.top;
      draw();
    };

    canvas.onmouseup = function(e) {
      isSelecting = false;
      selectionRect = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        w: Math.abs(endX - startX),
        h: Math.abs(endY - startY)
      };
      draw();
    };

    canvas.ondblclick = function(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      $scope.showTextInput(x, y);
    };
  };

  $scope.rotate = function () {
    // 存历史前，先只画图片本身
    draw(false);
    historyStack.push({
      dataUrl: canvas.toDataURL(),
      brightness: $scope.brightness,
      contrast: $scope.contrast,
      saturate: $scope.saturate
    });
    // 画面恢复
    draw();
    angle = (angle + 90) % 360;
    // 旋转画布
    let tempCanvas = document.createElement('canvas');
    let tempCtx = tempCanvas.getContext('2d');
    if (angle % 180 === 0) {
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
    } else {
      tempCanvas.width = img.height;
      tempCanvas.height = img.width;
    }
    tempCtx.save();
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(angle * Math.PI / 180);
    tempCtx.drawImage(img, -img.width / 2, -img.height / 2);
    tempCtx.restore();
    canvas.width = tempCanvas.width;
    canvas.height = tempCanvas.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
    img.src = canvas.toDataURL();
  };

  $scope.crop = function () {
    draw(false); // 先只画图片本身到主canvas
    historyStack.push({
      dataUrl: canvas.toDataURL(),
      brightness: $scope.brightness,
      contrast: $scope.contrast,
      saturate: $scope.saturate
    });
    draw(); // 恢复带虚线的画面

    if (!selectionRect || selectionRect.w === 0 || selectionRect.h === 0) {
      alert("请先用鼠标选择裁剪区域！");
      return;
    }

    // 新建一个临时canvas，只画图片本身
    let tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    let tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 从临时canvas上裁剪
    let imageData = tempCtx.getImageData(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);

    canvas.width = selectionRect.w;
    canvas.height = selectionRect.h;
    ctx.putImageData(imageData, 0, 0);

    // 关键：裁剪后，图片加载完成时清除选区并重绘
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      selectionRect = null;
      draw(false); // 不带虚线
    };
    img.src = canvas.toDataURL();
  };

  $scope.showTextInput = function(x, y) {
    // 先移除已有输入框
    let oldInput = document.getElementById('canvasTextInput');
    if (oldInput) oldInput.parentNode.removeChild(oldInput);

    // 创建textarea
    let textarea = document.createElement('textarea');
    textarea.id = 'canvasTextInput';
    textarea.rows = 2;
    textarea.style.position = 'absolute';
    textarea.style.left = (canvas.offsetLeft + x) + 'px';
    textarea.style.top = (canvas.offsetTop + y) + 'px';
    textarea.style.border = '1px dashed #f00';
    textarea.style.font = '30px Arial';
    textarea.style.color = 'red';
    textarea.style.background = 'transparent';
    textarea.style.zIndex = 1000;
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.overflow = 'hidden';
    textarea.style.padding = '2px';
    textarea.style.lineHeight = '36px';

    // 插入到canvas父节点
    canvas.parentNode.appendChild(textarea);
    textarea.focus();

    // 只在失去焦点时提交内容
    textarea.onblur = function() {
      if (textarea.value.trim() !== '') {
        draw(false); // 只画图片本身
        historyStack.push({
          dataUrl: canvas.toDataURL(),
          brightness: $scope.brightness,
          contrast: $scope.contrast,
          saturate: $scope.saturate
        });
        draw(); // 恢复
        ctx.font = "30px Arial";
        ctx.fillStyle = "red";
        // 支持多行
        let lines = textarea.value.split('\n');
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], x, y + 30 + i * 36); // 36为行高
        }
        img.src = canvas.toDataURL();
      }
      textarea.parentNode.removeChild(textarea);
    };
  };

  $scope.save = function () {
    draw(false); // 保存前不画虚线
    canvas.toBlob(function (blob) {
      blob.name = file.name;
      $uibModalInstance.close(blob);
    }, file.mimetype || 'image/png');
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };

  $scope.undo = function () {
    if (historyStack.length === 0) {
      alert("没有可回撤的操作！");
      return;
    }
    let lastState = historyStack.pop();
    selectionRect = null; // 先清空选区
    draw(false); // 清空当前canvas内容
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      // 恢复参数
      $scope.$apply(function() {
        $scope.brightness = lastState.brightness;
        $scope.contrast = lastState.contrast;
        $scope.saturate = lastState.saturate;
      });
      draw(); // 重新绘制，不带虚线
    };
    img.src = lastState.dataUrl;
  };

  $scope.applyFilter = function(type) {
    draw(false);
    historyStack.push({
      dataUrl: canvas.toDataURL(),
      brightness: $scope.brightness,
      contrast: $scope.contrast,
      saturate: $scope.saturate
    });
    draw();

    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    if (type === 'grayscale') {
      for (let i = 0; i < data.length; i += 4) {
        let avg = (data[i] + data[i+1] + data[i+2]) / 3;
        data[i] = data[i+1] = data[i+2] = avg;
      }
    } else if (type === 'invert') {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i+1] = 255 - data[i+1];
        data[i+2] = 255 - data[i+2];
      }
    } else if (type === 'blur') {
      // 简单模糊可用 ctx.filter，但要兼容保存，建议用 stackblur.js 或自定义算法
      ctx.filter = 'blur(2px)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
      return;
    }
    ctx.putImageData(imageData, 0, 0);
    img.src = canvas.toDataURL();
  };

  $scope.startAdjust = function() {
    if (!isAdjusting) {
      draw(false);
      historyStack.push({
        dataUrl: canvas.toDataURL(),
        brightness: $scope.brightness,
        contrast: $scope.contrast,
        saturate: $scope.saturate
      });
      adjustBackup = canvas.toDataURL();
      isAdjusting = true;
    }
  };

  $scope.endAdjust = function() {
    if (isAdjusting) {
      // 用 filter 绘制一次到 canvas 上，确保 canvas 是调整后的效果
      let tempImg = new window.Image();
      tempImg.onload = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.filter = `brightness(${$scope.brightness}) contrast(${$scope.contrast}) saturate(${$scope.saturate})`;
        ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';

        // 保存到img.src（不再push历史）
        var dataUrl = canvas.toDataURL();
        img.onload = function() {
          canvas.width = img.width;
          canvas.height = img.height;
          draw();
          isAdjusting = false;
          adjustBackup = null;
        };
        img.src = dataUrl;
      };
      tempImg.src = adjustBackup;
    }
  };

  $scope.adjustImage = function() {
    if (adjustBackup) {
      let tempImg = new window.Image();
      tempImg.onload = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.filter = `brightness(${$scope.brightness}) contrast(${$scope.contrast}) saturate(${$scope.saturate})`;
        ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
      };
      tempImg.src = adjustBackup;
    }
  };

  function draw(showSelection = true) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // 只在选区存在且需要显示时绘制虚线
    if (showSelection && (isSelecting || (selectionRect && selectionRect.w > 0 && selectionRect.h > 0))) {
      let x = isSelecting ? Math.min(startX, endX) : selectionRect.x;
      let y = isSelecting ? Math.min(startY, endY) : selectionRect.y;
      let w = isSelecting ? Math.abs(endX - startX) : selectionRect.w;
      let h = isSelecting ? Math.abs(endY - startY) : selectionRect.h;
      if (w > 0 && h > 0) {
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.setLineDash([6]);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
      }
    }
  }

  setTimeout($scope.init, 100); // 等待modal渲染
});
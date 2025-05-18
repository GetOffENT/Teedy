'use strict';

angular.module('docs').controller('ImageEdit', function ($scope, $uibModalInstance, file, Upload, $translate) {
  $scope.file = file;
  let canvas, ctx, img, angle = 0;
  let startX, startY, endX, endY, isSelecting = false, selectionRect = null;
  let historyStack = [];

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
  };

  $scope.rotate = function () {
    // 存历史前，先只画图片本身
    draw(false);
    historyStack.push(canvas.toDataURL());
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
    historyStack.push(canvas.toDataURL());
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

  $scope.addText = function () {
    draw(false);
    historyStack.push(canvas.toDataURL());
    draw();
    let text = prompt("请输入要添加的文字：");
    if (text) {
      ctx.font = "30px Arial";
      ctx.fillStyle = "red";
      ctx.fillText(text, 20, 40);
      img.src = canvas.toDataURL();
    }
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
    let lastDataUrl = historyStack.pop();
    selectionRect = null; // 先清空选区
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      draw(); // 重新绘制，不带虚线
    };
    img.src = lastDataUrl;
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
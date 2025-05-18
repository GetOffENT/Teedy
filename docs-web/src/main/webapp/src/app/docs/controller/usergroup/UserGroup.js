'use strict';

/**
 * User/group controller.
 */
angular.module('docs').controller('UserGroup', function(Restangular, $scope, $state) {
  // Load users
  Restangular.one('user/list').get({
    sort_column: 1,
    asc: true
  }).then(function(data) {
    $scope.users = data.users;
  });

  // Load groups
  Restangular.one('group').get({
    sort_column: 1,
    asc: true
  }).then(function(data) {
    $scope.groups = data.groups;
  });

  // Open a user
  $scope.openUser = function(user) {
    $state.go('user.profile', { username: user.username });
  };

  // Open a group
  $scope.openGroup = function(group) {
    $state.go('group.profile', { name: group.name });
  };

  // 访客注册申请
  $scope.showRegisterRequestForm = false;
  $scope.registerRequest = {};
  $scope.submitRegisterRequest = function() {
    Restangular.all('register/request').post($scope.registerRequest).then(function() {
      alert('申请已提交，等待管理员审核');
      $scope.showRegisterRequestForm = false;
      $scope.registerRequest = {};
    }, function(resp) {
      alert('提交失败: ' + (resp.data && resp.data.error ? resp.data.error : '未知错误'));
    });
  };
});
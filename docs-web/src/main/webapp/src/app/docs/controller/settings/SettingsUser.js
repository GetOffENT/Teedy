'use strict';

/**
 * Settings user page controller.
 */
angular.module('docs').controller('SettingsUser', function($scope, $state, Restangular) {
  /**
   * Load users from server.
   */
  $scope.loadUsers = function() {
    Restangular.one('user/list').get({
      sort_column: 1,
      asc: true
    }).then(function(data) {
      $scope.users = data.users;
    });
  };

  $scope.loadUsers();

  /**
   * Edit a user.
   */
  $scope.editUser = function(user) {
    $state.go('settings.user.edit', { username: user.username });
  };

  // 加载注册申请
  $scope.loadRegisterRequests = function() {
    Restangular.one('register/request').get().then(function(data) {
      $scope.registerRequests = data.requests;
    });
  };
  $scope.loadRegisterRequests();

  // 同意申请
  $scope.acceptRequest = function(id) {
    Restangular.one('register/request/accept', id).post().then(function() {
      $scope.loadRegisterRequests();
      $scope.loadUsers();
    });
  };
  // 拒绝申请
  $scope.rejectRequest = function(id) {
    var reason = prompt('请输入拒绝理由');
    Restangular.all('register/request/reject/' + id).post({ reason: reason }).then(function() {
      $scope.loadRegisterRequests();
    });
  };
});

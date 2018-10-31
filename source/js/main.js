$(document).ready(function() {
  $('.js-ham').on("click",function(){
    $('.js-ham').toggleClass('ham-toggle');
    $('#mobile-menu').toggleClass('open');
  })
});
$(document).ready(function(){
  
  $('[rel=tooltip]').tooltip();
  
  $('.lhs-holder').css('height', $(window).height() - 71 );
  $('.inner-nav').css('height', $(window).height() - 126 );
  $('.object-area').css('height', $(window).height() - 156 );
  $('.object-area').css('width', $(window).width() - 448 );

  
  $('body').on('click', '.info-expand a', function() {
    var $this = $(this),
        $show_hide = $this.closest('.row-fluid').next('.hidden-fields-area');
    
    if($this.hasClass("active")) {
      $show_hide.slideUp('fast');
      $this.removeClass("active");
    } else {
      $show_hide.slideDown('fast');
      $this.addClass("active");
    }
    
    return false;
    
  });
  
  $('body').on('click', '.expand-link a', function() {
    var $this = $(this),
        $show_hide = $this.closest('.row-fluid').next('.hidden-fields-area');
    
    if($this.hasClass("active")) {
      $show_hide.slideUp('fast');
      $this.removeClass("active");
    } else {
      $show_hide.slideDown('fast');
      $this.addClass("active");
    }
    
    return false;
    
  });
  
  $('body').on('click', 'ul.tree-structure .item-main .grcobject, ul.tree-structure .item-main .openclose', function(e) {
    openclose.call(this);
    e.stopPropagation();
  });

  function openclose(command) {
    var $that = $(this)
    , use_slide = $that.length < 100

    $that.each(function(){
      var $this = $(this)
        , $main = $this.closest('.item-main')
        , $li = $main.closest('li')
        , $content = $li.children('.item-content')
        , $icon = $main.find('.openclose')
        , $parentTree = $this.closest('ul.new-tree')
        , cmd = command;

      if(typeof cmd !== "string" || cmd === "toggle") {
        cmd = $icon.hasClass("active") ? "close" : "open";
      }

      if (cmd === "close") {
        
        use_slide ? $content.slideUp('fast') : $content.css("display", "none");
        $icon.removeClass('active');
        $li.removeClass('item-open');
        // Only remove tree open if there are no open siblings
        !$li.siblings('.item-open').length && $parentTree.removeClass('tree-open');
        $content.removeClass('content-open');
      } else if(cmd === "open") {
        use_slide ? $content.slideDown('fast') : $content.css("display", "block");
        $icon.addClass('active');
        $li.addClass('item-open');
        $parentTree.addClass('tree-open');
        $content.addClass('content-open');
      }
    });

    return this;
    
  }
  
  $.fn.openclose = openclose;
  
  $('body').on('click', '.advanced-filter-trigger', function() {
    var $this = $(this),
        $filters = $this.closest('.inner-tree').find('.advanced-filters');
    
    if($this.hasClass("active")) {
      $filters.slideUp('fast');
      $this.removeClass("active");
      $this.html('<i class="grcicon-search"></i> Show Filters');
    } else {
      $filters.slideDown('fast');
      $this.addClass("active");
      $this.html('<i class="grcicon-search"></i> Hide Filters');
    }
    
    return false;
    
  });
  
  $('.autogenerate').change(function(){
    $('.autogenerate-result').toggleClass('active', $(this).val() == 'control');
  });
  
  $('body').on('click', '.accordion-group a', function() {
    var $this = $(this),
        $subNav = $this.closest('.accordion-group').find('.sub-level'),
        $subAction = $this.closest('.accordion-group').find('.sub-actions');
    
    if($this.hasClass("active")) {
      $subNav.slideUp('fast');
      $subAction.slideUp('fast');
      $this.removeClass("active");
    } else {
      $subNav.slideDown('fast');
      $subAction.slideDown('fast');
      $this.addClass("active");
    }
    
    return false;
    
  });
  
  
  $('.internav li:gt(7)').hide();
  $('.add-more-objects').click(function() {
    $('.internav li:gt(7)').slideDown('fast');
    $(this).hide();
  });
  
  $( ".date" ).datepicker();
  
  $(function() {
    var people = [
      "Vladan Mitevski vladan@reciprocitylabs.com",
      "Predrag Kanazir predrag@reciprocitylabs.com",
      "Dan Ring danring@reciprocitylabs.com",
      "Silas Barta silas@reciprocitylabs.com"
    ];
    $( ".objective-selector input" ).autocomplete({
      source: people
    });
  });
  
  $('body').on('click', 'ul.internav li a', function() {
    var $this = $(this),
        $innerNavItem = $this.closest('li'),
        $allWidgets = $('.widget');
    
    $('ul.internav li.active').removeClass('active');
    $allWidgets.removeClass('widget-active').hide();
    
    if($innerNavItem.hasClass("active")) {
      $innerNavItem.removeClass("active");
    } else {
      $innerNavItem.addClass("active");
    }
    
    if($('ul.internav li.active a').attr('href') == '#info_widget') {
      $('#info_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#market_widget') {
      $('#market_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#control_widget') {
      $('#control_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#assessment_widget') {
      $('#assessment_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#process_widget') {
      $('#process_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#facility_widget') {
      $('#facility_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#authorization_widget') {
      $('#authorization_widget').addClass('widget-active').show();
    }
    if($('ul.internav li.active a').attr('href') == '#regulation_widget') {
      $('#regulation_widget').addClass('widget-active').show();
    } 
  });

  // New Assessment Created
  $('body').on('click', '#addAssessmentCreated', function() {
    $('#newAssessment').modal('hide');
    $('#assessmentCountObjectNav').html('2');
    $('#assessmentCountWidget').html('(2)');
    $('#mainAssessmentsCountNew').html('2');
    $('#addAssessment').fadeIn();
    
  });

  // New Object under Assessment Created
  $('body').on('click', '#addObjectUnderAssessmentCreated', function() {
    $('#newObjectToAssessment').modal('hide');
    $('#objectUnderAssessmentCountObjectNav').html('5');
    $('#objectItemUnderAssessmentCountObjectNav').html('5');
    $('#addObjectUnderAssessment').fadeIn();  
  });

  // Create New Task
  $('body').on('click', '#createNewTask', function() {
    $('#newTask').modal('hide');
    $('#newlyCreatedTaskTitle').html('Clean up');
    $('#newlyCreatedTask').fadeIn();
    $('#taskCounter').html('1');
  });

});
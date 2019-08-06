"use strict";

(function ($) {
  function benefitForm() {
    if (2 === performance.navigation.type) {
      location.reload(true);
    }

    $('.a-benefit-button.a-button-disabled').removeAttr('disabled');
    $('.a-benefit-button').click(function (event) {
      event.preventDefault();
      var $button = $(this);
      var $status = $('.m-benefit-message', $(this).parent());
      var $select = $('select', $(this).parent());
      var settings = minnpost_membership_settings; // reset the message for current status

      if (!'.m-benefit-message-success') {
        $('.m-benefit-message').removeClass('m-benefit-message-visible m-benefit-message-error m-benefit-message-info');
      } // set button to processing


      $button.text('Processing').addClass('a-button-disabled'); // disable all the other buttons

      $('.a-benefit-button').addClass('a-button-disabled'); // set ajax data

      var data = {};
      var benefitType = $('input[name="benefit-name"]').val();

      if ('partner-offers' === benefitType) {
        data = {
          'action': 'benefit_form_submit',
          'minnpost_membership_benefit_form_nonce': $button.data('benefit-nonce'),
          'current_url': $('input[name="current_url"]').val(),
          'benefit-name': $('input[name="benefit-name"]').val(),
          'instance_id': $('[name="instance-id-' + $button.val() + '"]').val(),
          'post_id': $button.val(),
          'is_ajax': '1'
        };
        $.post(settings.ajaxurl, data, function (response) {
          // success
          if (true === response.success) {
            //console.dir(response);
            $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);

            if (0 < $select.length) {
              $select.prop('disabled', true);
            }

            $('.a-benefit-button').not($button).val(response.data.button_value).attr('disabled', true);
          } else {
            // error
            //console.dir(response);
            if ('undefined' === typeof response.data.remove_instance_value) {
              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } else {
              $('option', $select).each(function (i) {
                if ($(this).val() === response.data.remove_instance_value) {
                  $(this).remove();
                }
              });

              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } // re-enable all the other buttons


            $('.a-benefit-button').not($button).removeClass('a-button-disabled');
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
          }
        });
      }
    });
  }

  $(document).ready(function () {
    if (0 < $('.m-form-membership-benefit').length) {
      benefitForm();
    }
  });
  $('.a-refresh-page').click(function (event) {
    event.preventDefault();
    location.reload();
  });
})(jQuery);
"use strict";

(function ($) {
  function mp_membership_analytics_tracking_event(type, category, action, label, value) {
    if (typeof ga !== 'undefined') {
      if (typeof value === 'undefined') {
        ga('send', type, category, action, label);
      } else {
        ga('send', type, category, action, label, value);
      }
    } else {
      return;
    }
  }

  $(document).ready(function () {
    $('.m-support-cta-top .a-support-button').click(function (event) {
      var value = '';

      if ($('svg', $(this)).length > 0) {
        value = $('svg', $(this)).attr('title') + ' ';
      }

      value = value + $(this).text();
      mp_membership_analytics_tracking_event('event', 'Support CTA - Header', 'Click: ' + value, location.pathname);
    });
  });
})(jQuery);
"use strict";

// plugin
;

(function ($, window, document, undefined) {
  // Create the defaults once
  var pluginName = 'minnpostMembership',
      defaults = {
    'debug': false,
    // this can be set to true on page level options
    'amount_selector_standalone': '#amount-item #amount',
    'frequency_selector_standalone': '.m-membership-fast-select input[type="radio"]',
    'level_viewer_container': '.a-show-level',
    'level_name': '.a-level',
    'user_current_level': '.a-current-level',
    'user_new_level': '.a-new-level',
    'amount_viewer': '.amount h3',
    'frequency_selector_in_levels': '.a-form-item-membership-frequency',
    'frequency_selector_in_levels_type': 'select',
    'levels_container': '.o-membership-member-levels',
    'single_level_container': '.m-membership-member-level',
    'single_level_summary_selector': '.m-member-level-brief',
    'flipped_items': 'div.amount, div.enter',
    'level_frequency_text_selector': '.show-frequency',
    'choose_amount_selector_in_levels': '.amount .a-button-flip',
    'amount_selector_in_levels': '.enter input.amount-entry'
  }; // end defaults
  // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function init(reset, amount) {
      // Place initialization logic here
      // You already have access to the DOM element and
      // the options via the instance, e.g. this.element
      // and this.options
      // you can add more functions like the one below and
      // call them like so: this.yourOtherFunction(this.element, this.options).
      this.catchHashLinks(this.element, this.options);
      this.levelFlipper(this.element, this.options);
      this.startLevelClick(this.element, this.options);
    },
    catchHashLinks: function catchHashLinks(element, options) {
      $('a[href*="#"]:not([href="#"])', element).click(function (e) {
        var target = $(e.target);

        if (target.parent('.comment-title').length == 0 && location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
          var target = $(this.hash);
          target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');

          if (target.length) {
            $('html,body').animate({
              scrollTop: target.offset().top
            }, 1000);
            return false;
          }
        }
      });
    },
    // end catchLinks
    levelFlipper: function levelFlipper(element, options) {
      var that = this;
      var previous_amount = '';
      var amount = 0;
      var level = '';
      var level_number = 0;
      var frequency_string = '';
      var frequency = '';
      var frequency_name = '';

      if (typeof minnpost_membership_data !== 'undefined' && $(options.user_current_level).length > 0) {
        previous_amount = minnpost_membership_data.current_user.previous_amount;
      }

      if ($(options.amount_selector_standalone).length > 0) {
        amount = $(options.amount_selector_standalone).val();
        frequency_string = $(options.frequency_selector_standalone + ':checked').val();
        frequency = frequency_string.split(' - ')[1];
        frequency_name = frequency_string.split(' - ')[0];
        level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
        that.showNewLevel(element, options, level);
        $(options.frequency_selector_standalone).change(function () {
          frequency_string = $(options.frequency_selector_standalone + ':checked').val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];
          level = that.checkLevel($(options.amount_selector_standalone).val(), $(options.frequency_selector_standalone + ':checked').attr('data-year-frequency'), frequency_name, previous_amount, element, options);
          that.showNewLevel(element, options, level);
        });
        $(options.amount_selector_standalone).bind('keyup mouseup', function () {
          frequency_string = $(options.frequency_selector_standalone + ':checked').val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];

          if ($(this).data('last-value') != $(this).val()) {
            $(this).data('last-value', $(this).val());
            level = that.checkLevel($(options.amount_selector_standalone).val(), $(options.frequency_selector_standalone + ':checked').attr('data-year-frequency'), frequency_name, previous_amount, element, options);
            that.showNewLevel(element, options, level);
          }

          ;
        });
      }

      if ($(options.levels_container).length > 0) {
        $(options.single_level_summary_selector, element).each(function () {
          $(options.flipped_items, $(this)).wrapAll('<div class="flipper"/>');
        });
        $(options.frequency_selector_in_levels, element).on('change', function (event) {
          level_number = $(this).data('member-level-number');
          frequency_string = $(this).val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];

          if (typeof level_number !== 'undefined') {
            $(options.single_level_summary_selector, element).removeClass('flipped');
            $(options.single_level_container, element).removeClass('active');
            $(event.target).closest(options.single_level_summary_selector).addClass('flipped');

            if (frequency == 1) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-yearly'));
            } else if (frequency == 12) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-monthly'));
            }

            amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
            level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
            that.changeFrequency(frequency_string, level['name'], element, options);
          } else if ($(options.level_frequency_text_selector).length > 0) {
            $(options.level_frequency_text_selector, element).text(frequency_name);
            $(options.single_level_container).each(function () {
              level_number = $(options.amount_selector_in_levels, $(this)).data('member-level-number');

              if (typeof level_number !== 'undefined') {
                amount = $(options.amount_selector_in_levels, $(this)).val();
                level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
              }
            });
          }

          that.changeAmountPreview(frequency_string, level['name'], element, options);
        });
      }

      if ($(options.choose_amount_selector_in_levels).length > 0) {
        $(options.choose_amount_selector_in_levels, element).click(function (event) {
          level_number = $(options.frequency_selector_in_levels, element).data('member-level-number');
          $(options.single_level_summary_selector, element).removeClass('flipped');
          $(options.single_level_container, element).removeClass('active');
          $(event.target).closest(options.single_level_summary_selector).addClass('flipped');
          frequency_string = $(options.frequency_selector_in_levels, $(this).parent()).val();
          frequency = frequency_string.split(' - ')[1];
          amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
          level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
          event.preventDefault();
        });
      }
    },
    // end levelFlipper
    checkLevel: function checkLevel(amount, frequency, type, previous_amount, element, options) {
      var thisyear = parseInt(amount) * parseInt(frequency);
      var level = '';

      if (typeof previous_amount !== 'undefined' && previous_amount !== '') {
        var prior_year_amount = parseInt(previous_amount.prior_year_contributions);
        var coming_year_amount = parseInt(previous_amount.coming_year_contributions);
        var annual_recurring_amount = parseInt(previous_amount.annual_recurring_amount); // calculate member level formula

        if (type === 'one-time') {
          prior_year_amount += thisyear;
        } else {
          annual_recurring_amount += thisyear;
        }

        thisyear = Math.max(prior_year_amount, coming_year_amount, annual_recurring_amount);
      }

      level = this.getLevel(thisyear);
      $('h2', options.single_level_summary_selector).each(function () {
        if ($(this).text() == level['name']) {
          $(options.single_level_container, element).removeClass('active');
          $(this).parent().parent().addClass('active');
        }
      });
      return level;
    },
    // end checkLevel
    getLevel: function getLevel(thisyear) {
      var level = [];

      if (thisyear > 0 && thisyear < 60) {
        level['name'] = 'Bronze';
        level['number'] = 1;
      } else if (thisyear > 59 && thisyear < 120) {
        level['name'] = 'Silver';
        level['number'] = 2;
      } else if (thisyear > 119 && thisyear < 240) {
        level['name'] = 'Gold';
        level['number'] = 3;
      } else if (thisyear > 239) {
        level['name'] = 'Platinum';
        level['number'] = 4;
      }

      return level;
    },
    // end getLevel
    showNewLevel: function showNewLevel(element, options, level) {
      var member_level_prefix = '';
      var old_level = '';
      var level_viewer_container_selector = options.level_viewer_container; // this should change when we replace the text, if there is a link inside it

      var decodeHtmlEntity = function decodeHtmlEntity(str) {
        return str.replace(/&#(\d+);/g, function (match, dec) {
          return String.fromCharCode(dec);
        });
      };

      if (typeof minnpost_membership_data !== 'undefined') {
        member_level_prefix = minnpost_membership_data.member_level_prefix;
      }

      if ($(options.level_viewer_container).length > 0) {
        $(options.level_viewer_container).prop('class', 'a-show-level a-show-level-' + level['name'].toLowerCase());

        if ($(options.user_current_level).length > 0 && minnpost_membership_data.current_user.member_level.length > 0) {
          if ('a', $(options.level_viewer_container).length > 0) {
            level_viewer_container_selector = options.level_viewer_container + ' a';
          }

          old_level = minnpost_membership_data.current_user.member_level.replace(member_level_prefix, '');

          if (old_level !== level['name'].toLowerCase()) {
            $(level_viewer_container_selector).html(decodeHtmlEntity($(options.level_viewer_container).data('changed')));
          } else {
            $(level_viewer_container_selector).html(decodeHtmlEntity($(options.level_viewer_container).data('not-changed')));
          }
        }

        $(options.level_name, options.level_viewer_container).text(level['name']);
      }
    },
    // end showNewLevel
    changeFrequency: function changeFrequency(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        var range = $(options.amount_viewer, $(this)).text();
        var month_value = $(options.amount_viewer, $(this)).data('month');
        var year_value = $(options.amount_viewer, $(this)).data('year');
        var once_value = $(options.amount_viewer, $(this)).data('one-time');
        var frequency_name = selected.split(' - ')[0];
        var frequency = parseInt(selected.split(' - ')[1]);
        $(options.frequency_selector_in_levels).val(selected);
        $(options.frequency_selector_in_levels).prop('selected', selected);

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
        $(options.frequency_selector_in_levels, $(this)).data('frequency', frequency);
      });
    },
    // end changeFrequency
    changeAmountPreview: function changeAmountPreview(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        var range = $(options.amount_viewer, $(this)).text();
        var month_value = $(options.amount_viewer, $(this)).data('month');
        var year_value = $(options.amount_viewer, $(this)).data('year');
        var once_value = $(options.amount_viewer, $(this)).data('one-time');
        var frequency_name = selected.split(' - ')[0];

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
      });
    },
    // end changeAmountPreview
    startLevelClick: function startLevelClick(element, options) {
      $('.start-level').click(function () {
        var level_class = $(this).prop('class');
        var level_number = level_class[level_class.length - 1];
        $(options.single_level_summary_selector, element).removeClass('flipped');
        $(options.single_level_container, element).removeClass('active');
        $(options.single_level_container + '-' + level_number, element).addClass('active');
        $(options.single_level_container + '-' + level_number + ' ' + options.single_level_summary_selector).addClass('flipped');
      });
    } // end startLevelClick

  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document);
"use strict";

// plugin
;

(function ($, window, document) {
  // Create the defaults once
  var pluginName = 'minnpostTrackSubmit',
      defaults = {
    type: 'event',
    category: 'Support Us',
    action: 'Become A Member',
    label: location.pathname
  }; // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function init() {
      var that = this;
      var options = this.options;
      $(this.element).submit(function (event) {
        that.analyticsEventTrack(options.type, options.category, options.action, options.label); // also bubbles the event up to submit the form
      });
    },
    analyticsEventTrack: function analyticsEventTrack(type, category, action, label, value) {
      if (typeof ga === 'undefined') {
        return;
      }

      if (typeof value === 'undefined') {
        ga('send', type, category, action, label);
        return;
      }

      ga('send', type, category, action, label, value);
    } // end analyticsEventTrack

  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlbmVmaXRzLmpzIiwiY3RhLmpzIiwibWVtYmVyLWxldmVscy5qcyIsInRyYWNrLXN1Ym1pdC5qcyJdLCJuYW1lcyI6WyIkIiwiYmVuZWZpdEZvcm0iLCJwZXJmb3JtYW5jZSIsIm5hdmlnYXRpb24iLCJ0eXBlIiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCJwYXJlbnQiLCIkc2VsZWN0Iiwic2V0dGluZ3MiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzIiwicmVtb3ZlQ2xhc3MiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJkYXRhIiwiYmVuZWZpdFR5cGUiLCJ2YWwiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwic3VjY2VzcyIsImJ1dHRvbl92YWx1ZSIsImJ1dHRvbl9sYWJlbCIsImJ1dHRvbl9jbGFzcyIsInByb3AiLCJidXR0b25fYXR0ciIsImh0bWwiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImxlbmd0aCIsIm5vdCIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJzaG93IiwiaGlkZSIsImVhY2giLCJpIiwicmVtb3ZlIiwiZG9jdW1lbnQiLCJyZWFkeSIsImpRdWVyeSIsIm1wX21lbWJlcnNoaXBfYW5hbHl0aWNzX3RyYWNraW5nX2V2ZW50IiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwiZ2EiLCJwYXRobmFtZSIsIndpbmRvdyIsInVuZGVmaW5lZCIsInBsdWdpbk5hbWUiLCJkZWZhdWx0cyIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwicHJvdG90eXBlIiwicmVzZXQiLCJhbW91bnQiLCJjYXRjaEhhc2hMaW5rcyIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsImUiLCJ0YXJnZXQiLCJyZXBsYWNlIiwiaG9zdG5hbWUiLCJoYXNoIiwic2xpY2UiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwidGhhdCIsInByZXZpb3VzX2Ftb3VudCIsImxldmVsIiwibGV2ZWxfbnVtYmVyIiwiZnJlcXVlbmN5X3N0cmluZyIsImZyZXF1ZW5jeSIsImZyZXF1ZW5jeV9uYW1lIiwibWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhIiwidXNlcl9jdXJyZW50X2xldmVsIiwiY3VycmVudF91c2VyIiwiYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUiLCJmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsInNwbGl0IiwiY2hlY2tMZXZlbCIsInNob3dOZXdMZXZlbCIsImNoYW5nZSIsImJpbmQiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJmbGlwcGVkX2l0ZW1zIiwid3JhcEFsbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJvbiIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJjbG9zZXN0IiwiYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsImFtb3VudF92aWV3ZXIiLCJjaGFuZ2VGcmVxdWVuY3kiLCJsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciIsImNoYW5nZUFtb3VudFByZXZpZXciLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInRoaXN5ZWFyIiwicGFyc2VJbnQiLCJwcmlvcl95ZWFyX2Ftb3VudCIsInByaW9yX3llYXJfY29udHJpYnV0aW9ucyIsImNvbWluZ195ZWFyX2Ftb3VudCIsImNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMiLCJhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCIsIk1hdGgiLCJtYXgiLCJnZXRMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInRvTG93ZXJDYXNlIiwibWVtYmVyX2xldmVsIiwibGV2ZWxfbmFtZSIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwibGV2ZWxfY2xhc3MiLCJmbiIsInN1Ym1pdCIsImFuYWx5dGljc0V2ZW50VHJhY2siXSwibWFwcGluZ3MiOiI7O0FBQUEsQ0FBRSxVQUFVQSxDQUFWLEVBQWM7QUFFZixXQUFTQyxXQUFULEdBQXVCO0FBQ3RCLFFBQUssTUFBTUMsV0FBVyxDQUFDQyxVQUFaLENBQXVCQyxJQUFsQyxFQUF5QztBQUN0Q0MsTUFBQUEsUUFBUSxDQUFDQyxNQUFULENBQWlCLElBQWpCO0FBQ0Y7O0FBQ0ROLElBQUFBLENBQUMsQ0FBRSxxQ0FBRixDQUFELENBQTJDTyxVQUEzQyxDQUF1RCxVQUF2RDtBQUNBUCxJQUFBQSxDQUFDLENBQUUsbUJBQUYsQ0FBRCxDQUF5QlEsS0FBekIsQ0FBZ0MsVUFBVUMsS0FBVixFQUFrQjtBQUNqREEsTUFBQUEsS0FBSyxDQUFDQyxjQUFOO0FBQ0EsVUFBSUMsT0FBTyxHQUFJWCxDQUFDLENBQUUsSUFBRixDQUFoQjtBQUNBLFVBQUlZLE9BQU8sR0FBSVosQ0FBQyxDQUFFLG9CQUFGLEVBQXdCQSxDQUFDLENBQUUsSUFBRixDQUFELENBQVVhLE1BQVYsRUFBeEIsQ0FBaEI7QUFDQSxVQUFJQyxPQUFPLEdBQUlkLENBQUMsQ0FBRSxRQUFGLEVBQVlBLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVWEsTUFBVixFQUFaLENBQWhCO0FBQ0EsVUFBSUUsUUFBUSxHQUFHQyw0QkFBZixDQUxpRCxDQU1qRDs7QUFDQSxVQUFLLENBQUUsNEJBQVAsRUFBc0M7QUFDckNoQixRQUFBQSxDQUFDLENBQUUsb0JBQUYsQ0FBRCxDQUEwQmlCLFdBQTFCLENBQXVDLDBFQUF2QztBQUNBLE9BVGdELENBVWpEOzs7QUFDQU4s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RVgsRUFrRW1CVixRQWxFbkIiLCJmaWxlIjoibWlubnBvc3QtbWVtYmVyc2hpcC1mcm9udC1lbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdGlmICggMiA9PT0gcGVyZm9ybWFuY2UubmF2aWdhdGlvbi50eXBlICkge1xuXHRcdCAgIGxvY2F0aW9uLnJlbG9hZCggdHJ1ZSApO1xuXHRcdH1cblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciAkYnV0dG9uICA9ICQoIHRoaXMgKTtcblx0XHRcdHZhciAkc3RhdHVzICA9ICQoICcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciAkc2VsZWN0ICA9ICQoICdzZWxlY3QnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdGlmICggISAnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnICkge1xuXHRcdFx0XHQkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApLnJlbW92ZUNsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSBtLWJlbmVmaXQtbWVzc2FnZS1lcnJvciBtLWJlbmVmaXQtbWVzc2FnZS1pbmZvJyApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHQkYnV0dG9uLnRleHQoICdQcm9jZXNzaW5nJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIGRpc2FibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0dmFyIGRhdGEgPSB7fTtcblx0XHRcdHZhciBiZW5lZml0VHlwZSA9ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJyApLnZhbCgpO1xuXHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdCAgICBkYXRhID0ge1xuXHRcdFx0ICAgICAgICAnYWN0aW9uJyA6ICdiZW5lZml0X2Zvcm1fc3VibWl0Jyxcblx0XHRcdCAgICAgICAgJ21pbm5wb3N0X21lbWJlcnNoaXBfYmVuZWZpdF9mb3JtX25vbmNlJyA6ICRidXR0b24uZGF0YSggJ2JlbmVmaXQtbm9uY2UnICksXG5cdFx0XHQgICAgICAgICdjdXJyZW50X3VybCcgOiAkKCAnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHQgICAgICAgICdiZW5lZml0LW5hbWUnOiAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpLFxuXHRcdFx0ICAgICAgICAnaW5zdGFuY2VfaWQnIDogJCggJ1tuYW1lPVwiaW5zdGFuY2UtaWQtJyArICRidXR0b24udmFsKCkgKyAnXCJdJyApLnZhbCgpLFxuXHRcdFx0ICAgICAgICAncG9zdF9pZCcgOiAkYnV0dG9uLnZhbCgpLFxuXHRcdFx0ICAgICAgICAnaXNfYWpheCcgOiAnMScsXG5cdFx0XHQgICAgfTtcblxuXHRcdFx0ICAgICQucG9zdCggc2V0dGluZ3MuYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0ICAgIFx0Ly8gc3VjY2Vzc1xuXHRcdFx0XHQgICAgaWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHQgICAgXHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0ICAgIFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0ICAgIFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHQgICAgXHRpZiAoIDAgPCAkc2VsZWN0Lmxlbmd0aCApIHtcblx0XHRcdFx0ICAgIFx0XHQkc2VsZWN0LnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHQgICAgXHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubm90KCAkYnV0dG9uICkudmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLmF0dHIoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0ICAgIH0gZWxzZSB7XG5cdFx0XHRcdCAgICBcdC8vIGVycm9yXG5cdFx0XHRcdCAgICBcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHQgICAgXHRpZiAoICd1bmRlZmluZWQnID09PSB0eXBlb2YgcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0ICAgIFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0ICAgIFx0fSBlbHNlIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0XHQgICAgfSBlbHNlIHtcblx0XHRcdFx0ICAgIFx0XHQkKCAnb3B0aW9uJywgJHNlbGVjdCApLmVhY2goIGZ1bmN0aW9uKCBpICkge1xuXHRcdFx0XHQgICAgXHRcdFx0aWYgKCAkKCB0aGlzICkudmFsKCkgPT09IHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHQgICAgXHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdCAgICBcdFx0XHR9XG5cdFx0XHRcdCAgICBcdFx0fSk7XG5cdFx0XHRcdCAgICBcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0ICAgIFx0fSBlbHNlIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHQgICAgXHQvLyByZS1lbmFibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHRcdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubm90KCAkYnV0dG9uICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblx0XHRcdFx0ICAgIFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHQgICAgfVxuXG5cdFx0XHRcdH0pO1xuXHRcdCAgICB9XG5cdFx0fSk7XG5cdH1cblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0XHRpZiAoIDAgPCAkKCAnLm0tZm9ybS1tZW1iZXJzaGlwLWJlbmVmaXQnICkubGVuZ3RoICkge1xuXHRcdFx0YmVuZWZpdEZvcm0oKTtcblx0XHR9XG5cdH0pO1xuXG5cdCQoICcuYS1yZWZyZXNoLXBhZ2UnICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIiggZnVuY3Rpb24oICQgKSB7XG5cdGZ1bmN0aW9uIG1wX21lbWJlcnNoaXBfYW5hbHl0aWNzX3RyYWNraW5nX2V2ZW50KCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKSB7XG5cdFx0aWYgKCB0eXBlb2YgZ2EgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdH1cblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHsgXG5cdFx0JCggJy5tLXN1cHBvcnQtY3RhLXRvcCAuYS1zdXBwb3J0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIHZhbHVlID0gJyc7XG5cdFx0XHRpZiAoICQoICdzdmcnLCAkKCB0aGlzICkgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHR2YWx1ZSA9ICQoICdzdmcnLCAkKCB0aGlzICkgKS5hdHRyKCAndGl0bGUnICkgKyAnICc7XG5cdFx0XHR9XG5cdFx0XHR2YWx1ZSA9IHZhbHVlICsgJCggdGhpcyApLnRleHQoKTtcblx0XHRcdG1wX21lbWJlcnNoaXBfYW5hbHl0aWNzX3RyYWNraW5nX2V2ZW50KCAnZXZlbnQnLCAnU3VwcG9ydCBDVEEgLSBIZWFkZXInLCAnQ2xpY2s6ICcgKyB2YWx1ZSwgbG9jYXRpb24ucGF0aG5hbWUgKTtcblx0XHR9KTtcblx0fSk7XG5cbn0gKSggalF1ZXJ5ICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50LCB1bmRlZmluZWQgKSB7XG5cblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0TWVtYmVyc2hpcCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdCdkZWJ1ZycgOiBmYWxzZSwgLy8gdGhpcyBjYW4gYmUgc2V0IHRvIHRydWUgb24gcGFnZSBsZXZlbCBvcHRpb25zXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lJyA6ICcjYW1vdW50LWl0ZW0gI2Ftb3VudCcsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lJyA6ICcubS1tZW1iZXJzaGlwLWZhc3Qtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0J2xldmVsX3ZpZXdlcl9jb250YWluZXInIDogJy5hLXNob3ctbGV2ZWwnLFxuXHRcdCdsZXZlbF9uYW1lJyA6ICcuYS1sZXZlbCcsXG5cdFx0J3VzZXJfY3VycmVudF9sZXZlbCcgOiAnLmEtY3VycmVudC1sZXZlbCcsXG5cdFx0J3VzZXJfbmV3X2xldmVsJyA6ICcuYS1uZXctbGV2ZWwnLFxuXHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGgzJyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlJyA6ICdzZWxlY3QnLFxuXHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdCdsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcicgOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHQnY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdCdhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXG5cdFx0aW5pdDogZnVuY3Rpb24oIHJlc2V0LCBhbW91bnQgKSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHQgICAgdmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0ICAgIGlmICh0YXJnZXQucGFyZW50KCcuY29tbWVudC10aXRsZScpLmxlbmd0aCA9PSAwICYmIGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSA9PSB0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSAmJiBsb2NhdGlvbi5ob3N0bmFtZSA9PSB0aGlzLmhvc3RuYW1lKSB7XG5cdFx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHQgICAgdGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3Bcblx0XHRcdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNhdGNoTGlua3NcblxuXHRcdGxldmVsRmxpcHBlcjogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgcHJldmlvdXNfYW1vdW50ID0gJyc7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdHZhciBsZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX251bWJlciA9IDA7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICYmICQoIG9wdGlvbnMudXNlcl9jdXJyZW50X2xldmVsICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0cHJldmlvdXNfYW1vdW50ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCk7XG5cdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdCAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblxuXHRcdFx0ICAgICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSkuY2hhbmdlKCBmdW5jdGlvbigpIHtcblxuXHRcdFx0ICAgIFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKVxuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdCAgICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCksICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnICkuYXR0ciggJ2RhdGEteWVhci1mcmVxdWVuY3knICksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0ICAgIH0pO1xuXG5cdFx0XHQgICAgJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lKS5iaW5kKCdrZXl1cCBtb3VzZXVwJywgZnVuY3Rpb24oKSB7XG5cdFx0XHQgICAgXHRmcmVxdWVuY3lfc3RyaW5nID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICAgIGlmKCQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScpICE9ICQodGhpcykudmFsKCkpIHtcblx0XHRcdCAgICAgICAgJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJywgJCh0aGlzKS52YWwoKSk7XG5cdFx0XHQgICAgICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCksICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnICkuYXR0ciggJ2RhdGEteWVhci1mcmVxdWVuY3knICksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdCAgICAgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHQgICAgICB9O1xuXHRcdFx0ICAgIH0pO1xuXG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0ICAgIGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXG5cdFx0XHRcdFx0XHRpZiAoIGZyZXF1ZW5jeSA9PSAxICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC15ZWFybHknICkgKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeSA9PSAxMiApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQtbW9udGhseScgKSApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0dGhhdC5jaGFuZ2VGcmVxdWVuY3koIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICQoIG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yLCBlbGVtZW50KS50ZXh0KGZyZXF1ZW5jeV9uYW1lKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLnZhbCgpO1xuXHRcdFx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHQgIHZhciB0aGlzeWVhciA9IHBhcnNlSW50KCBhbW91bnQgKSAqIHBhcnNlSW50KCBmcmVxdWVuY3kgKTtcblx0XHQgIHZhciBsZXZlbCA9ICcnO1xuXHRcdCAgaWYgKCB0eXBlb2YgcHJldmlvdXNfYW1vdW50ICE9PSAndW5kZWZpbmVkJyAmJiBwcmV2aW91c19hbW91bnQgIT09ICcnICkge1xuXHRcdCAgICB2YXIgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgICAgLy8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0ICAgIGlmICggdHlwZSA9PT0gJ29uZS10aW1lJyApIHtcblx0XHQgICAgICBwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfSBlbHNlIHtcblx0XHQgICAgICBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHQgICAgfVxuXG5cdFx0ICAgIHRoaXN5ZWFyID0gTWF0aC5tYXgoIHByaW9yX3llYXJfYW1vdW50LCBjb21pbmdfeWVhcl9hbW91bnQsIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICB9XG5cblx0XHQgIGxldmVsID0gdGhpcy5nZXRMZXZlbCggdGhpc3llYXIgKTtcblxuXHRcdCAgJCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHQgICAgaWYgKCAkKHRoaXMpLnRleHQoKSA9PSBsZXZlbFsnbmFtZSddICkge1xuXHRcdCAgICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgICAgJCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgfVxuXHRcdCAgfSApO1xuXHRcdCAgcmV0dXJuIGxldmVsO1xuXG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsOiBmdW5jdGlvbiggdGhpc3llYXIgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSBbXTtcblx0XHRcdGlmICggdGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjAgKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnQnJvbnplJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbDogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICkge1xuXHRcdFx0dmFyIG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdHZhciBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyOyAvLyB0aGlzIHNob3VsZCBjaGFuZ2Ugd2hlbiB3ZSByZXBsYWNlIHRoZSB0ZXh0LCBpZiB0aGVyZSBpcyBhIGxpbmsgaW5zaWRlIGl0XG5cdFx0XHR2YXIgZGVjb2RlSHRtbEVudGl0eSA9IGZ1bmN0aW9uKCBzdHIgKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSggLyYjKFxcZCspOy9nLCBmdW5jdGlvbiggbWF0Y2gsIGRlYyApIHtcblx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSggZGVjICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEubWVtYmVyX2xldmVsX3ByZWZpeDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyKS5wcm9wKCAnY2xhc3MnLCAnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICk7XG5cblx0XHRcdFx0aWYgKCAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgJiYgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHRcdGlmICggJ2EnLCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0bGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciArICcgYSc7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b2xkX2xldmVsID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwucmVwbGFjZSggbWVtYmVyX2xldmVsX3ByZWZpeCwgJycgKTtcblxuXHRcdFx0XHRcdGlmICggb2xkX2xldmVsICE9PSBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKSB7XG5cdFx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ2NoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCBsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkuZGF0YSggJ25vdC1jaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfbmFtZSwgb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyKS50ZXh0KCBsZXZlbFsnbmFtZSddICk7XG5cdFx0XHR9XG5cblx0XHR9LCAvLyBlbmQgc2hvd05ld0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeSAgICAgID0gcGFyc2VJbnQoIHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSApO1xuXG5cdFx0XHQgICAgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkudmFsKCBzZWxlY3RlZCApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcbiAgICBcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS5kYXRhKCAnZnJlcXVlbmN5JywgZnJlcXVlbmN5ICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHQgICAgdmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0ICAgIHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgbGV2ZWxfY2xhc3MgPSAkKCB0aGlzICkucHJvcCggJ2NsYXNzJyApO1xuXHRcdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gbGV2ZWxfY2xhc3NbbGV2ZWxfY2xhc3MubGVuZ3RoIC0xXTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICsgJyAnICsgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdCAgfSk7XG5cdFx0fSwgLy8gZW5kIHN0YXJ0TGV2ZWxDbGlja1xuXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQgKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdFRyYWNrU3VibWl0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0dHlwZTogJ2V2ZW50Jyxcblx0XHRjYXRlZ29yeTogJ1N1cHBvcnQgVXMnLFxuXHRcdGFjdGlvbjogJ0JlY29tZSBBIE1lbWJlcicsXG5cdFx0bGFiZWw6IGxvY2F0aW9uLnBhdGhuYW1lXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcblxuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuc3VibWl0KCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdHRoYXQuYW5hbHl0aWNzRXZlbnRUcmFjayhcblx0XHRcdFx0XHRvcHRpb25zLnR5cGUsXG5cdFx0XHRcdFx0b3B0aW9ucy5jYXRlZ29yeSxcblx0XHRcdFx0XHRvcHRpb25zLmFjdGlvbixcblx0XHRcdFx0XHRvcHRpb25zLmxhYmVsXG5cdFx0XHRcdCk7XG5cdFx0XHRcdC8vIGFsc28gYnViYmxlcyB0aGUgZXZlbnQgdXAgdG8gc3VibWl0IHRoZSBmb3JtXG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0YW5hbHl0aWNzRXZlbnRUcmFjazogZnVuY3Rpb24oIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICk7XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc0V2ZW50VHJhY2tcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIl19

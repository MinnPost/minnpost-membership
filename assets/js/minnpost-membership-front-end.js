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
      this.submitForm(this.element, this.options);
    },
    analyticsEventTrack: function analyticsEventTrack(type, category, action, label, value) {
      if (typeof ga !== 'undefined') {
        if (typeof value === 'undefined') {
          ga('send', type, category, action, label);
        } else {
          ga('send', type, category, action, label, value);
        }
      } else {
        return;
      }
    },
    // end analyticsEventTrack
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
    },
    // end startLevelClick
    submitForm: function submitForm(element, options) {
      var that = this;
      $(element).submit(function (event) {
        that.analyticsEventTrack('event', 'Support Us', 'Become A Member', location.pathname);
      });
    } // end submitForm

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJlbmVmaXRzLmpzIiwibWVtYmVyLWxldmVscy5qcyJdLCJuYW1lcyI6WyIkIiwiYmVuZWZpdEZvcm0iLCJwZXJmb3JtYW5jZSIsIm5hdmlnYXRpb24iLCJ0eXBlIiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCJwYXJlbnQiLCIkc2VsZWN0Iiwic2V0dGluZ3MiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzIiwicmVtb3ZlQ2xhc3MiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJkYXRhIiwiYmVuZWZpdFR5cGUiLCJ2YWwiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwic3VjY2VzcyIsImJ1dHRvbl92YWx1ZSIsImJ1dHRvbl9sYWJlbCIsImJ1dHRvbl9jbGFzcyIsInByb3AiLCJidXR0b25fYXR0ciIsImh0bWwiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImxlbmd0aCIsIm5vdCIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJzaG93IiwiaGlkZSIsImVhY2giLCJpIiwicmVtb3ZlIiwiZG9jdW1lbnQiLCJyZWFkeSIsImpRdWVyeSIsIndpbmRvdyIsInVuZGVmaW5lZCIsInBsdWdpbk5hbWUiLCJkZWZhdWx0cyIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwicHJvdG90eXBlIiwicmVzZXQiLCJhbW91bnQiLCJjYXRjaEhhc2hMaW5rcyIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsInN1Ym1pdEZvcm0iLCJhbmFseXRpY3NFdmVudFRyYWNrIiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwiZ2EiLCJlIiwidGFyZ2V0IiwicGF0aG5hbWUiLCJyZXBsYWNlIiwiaG9zdG5hbWUiLCJoYXNoIiwic2xpY2UiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwidGhhdCIsInByZXZpb3VzX2Ftb3VudCIsImxldmVsIiwibGV2ZWxfbnVtYmVyIiwiZnJlcXVlbmN5X3N0cmluZyIsImZyZXF1ZW5jeSIsImZyZXF1ZW5jeV9uYW1lIiwibWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhIiwidXNlcl9jdXJyZW50X2xldmVsIiwiY3VycmVudF91c2VyIiwiYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUiLCJmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsInNwbGl0IiwiY2hlY2tMZXZlbCIsInNob3dOZXdMZXZlbCIsImNoYW5nZSIsImJpbmQiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJmbGlwcGVkX2l0ZW1zIiwid3JhcEFsbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJvbiIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJjbG9zZXN0IiwiYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsImFtb3VudF92aWV3ZXIiLCJjaGFuZ2VGcmVxdWVuY3kiLCJsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciIsImNoYW5nZUFtb3VudFByZXZpZXciLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInRoaXN5ZWFyIiwicGFyc2VJbnQiLCJwcmlvcl95ZWFyX2Ftb3VudCIsInByaW9yX3llYXJfY29udHJpYnV0aW9ucyIsImNvbWluZ195ZWFyX2Ftb3VudCIsImNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMiLCJhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCIsIk1hdGgiLCJtYXgiLCJnZXRMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInRvTG93ZXJDYXNlIiwibWVtYmVyX2xldmVsIiwibGV2ZWxfbmFtZSIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwibGV2ZWxfY2xhc3MiLCJzdWJtaXQiLCJmbiJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxDQUFFLFVBQVVBLENBQVYsRUFBYztBQUVmLFdBQVNDLFdBQVQsR0FBdUI7QUFDdEIsUUFBSyxNQUFNQyxXQUFXLENBQUNDLFVBQVosQ0FBdUJDLElBQWxDLEVBQXlDO0FBQ3RDQyxNQUFBQSxRQUFRLENBQUNDLE1BQVQsQ0FBaUIsSUFBakI7QUFDRjs7QUFDRE4sSUFBQUEsQ0FBQyxDQUFFLHFDQUFGLENBQUQsQ0FBMkNPLFVBQTNDLENBQXVELFVBQXZEO0FBQ0FQLElBQUFBLENBQUMsQ0FBRSxtQkFBRixDQUFELENBQXlCUSxLQUF6QixDQUFnQyxVQUFVQyxLQUFWLEVBQWtCO0FBQ2pEQSxNQUFBQSxLQUFLLENBQUNDLGNBQU47QUFDQSxVQUFJQyxPQUFPLEdBQUlYLENBQUMsQ0FBRSxJQUFGLENBQWhCO0FBQ0EsVUFBSVksT0FBTyxHQUFJWixDQUFDLENBQUUsb0JBQUYsRUFBd0JBLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVWEsTUFBVixFQUF4QixDQUFoQjtBQUNBLFVBQUlDLE9BQU8sR0FBSWQsQ0FBQyxDQUFFLFFBQUYsRUFBWUEsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVYSxNQUFWLEVBQVosQ0FBaEI7QUFDQSxVQUFJRSxRQUFRLEdBQUdDLDRCQUFmLENBTGlELENBTWpEOztBQUNBLFVBQUssQ0FBRSw0QkFBUCxFQUFzQztBQUNyQ2hCLFFBQUFBLENBQUMsQ0FBRSxvQkFBRixDQUFELENBQTBCaUIsV0FBMUIsQ0FBdUMsMEVBQXZDO0FBQ0EsT0FUZ0QsQ0FVakQ7OztBQUNBTixNQUFBQSxPQUFPLENBQUNPLElBQVIsQ0FBYyxZQUFkLEVBQTZCQyxRQUE3QixDQUF1QyxtQkFBdkMsRUFYaUQsQ0FhakQ7O0FBQ0FuQixNQUFBQSxDQUFDLENBQUUsbUJBQUYsQ0FBRCxDQUF5Qm1CLFFBQXpCLENBQW1DLG1CQUFuQyxFQWRpRCxDQWdCakQ7O0FBQ0EsVUFBSUMsSUFBSSxHQUFHLEVBQVg7QUFDQSxVQUFJQyxXQUFXLEdBQUdyQixDQUFDLENBQUUsNEJBQUYsQ0FBRCxDQUFrQ3NCLEdBQWxDLEVBQWxCOztBQUNBLFVBQUsscUJBQXFCRCxXQUExQixFQUF3QztBQUNwQ0QsUUFBQUEsSUFBSSxHQUFHO0FBQ0gsb0JBQVcscUJBRFI7QUFFSCxvREFBMkNULE9BQU8sQ0FBQ1MsSUFBUixDQUFjLGVBQWQsQ0FGeEM7QUFHSCx5QkFBZ0JwQixDQUFDLENBQUUsMkJBQUYsQ0FBRCxDQUFnQ3NCLEdBQWhDLEVBSGI7QUFJSCwwQkFBZ0J0QixDQUFDLENBQUUsNEJBQUYsQ0FBRCxDQUFpQ3NCLEdBQWpDLEVBSmI7QUFLSCx5QkFBZ0J0QixDQUFDLENBQUUsd0JBQXdCVyxPQUFPLENBQUNXLEdBQVIsRUFBeEIsR0FBd0MsSUFBMUMsQ0FBRCxDQUFrREEsR0FBbEQsRUFMYjtBQU1ILHFCQUFZWCxPQUFPLENBQUNXLEdBQVIsRUFOVDtBQU9ILHFCQUFZO0FBUFQsU0FBUDtBQVVBdEIsUUFBQUEsQ0FBQyxDQUFDdUIsSUFBRixDQUFRUixRQUFRLENBQUNTLE9BQWpCLEVBQTBCSixJQUExQixFQUFnQyxVQUFVSyxRQUFWLEVBQXFCO0FBQ3BEO0FBQ0EsY0FBSyxTQUFTQSxRQUFRLENBQUNDLE9BQXZCLEVBQWlDO0FBQ2hDO0FBQ0FmLFlBQUFBLE9BQU8sQ0FBQ1csR0FBUixDQUFhRyxRQUFRLENBQUNMLElBQVQsQ0FBY08sWUFBM0IsRUFBMENULElBQTFDLENBQWdETyxRQUFRLENBQUNMLElBQVQsQ0FBY1EsWUFBOUQsRUFBNkVYLFdBQTdFLENBQTBGLG1CQUExRixFQUFnSEUsUUFBaEgsQ0FBMEhNLFFBQVEsQ0FBQ0wsSUFBVCxDQUFjUyxZQUF4SSxFQUF1SkMsSUFBdkosQ0FBNkpMLFFBQVEsQ0FBQ0wsSUFBVCxDQUFjVyxXQUEzSyxFQUF3TCxJQUF4TDtBQUNBbkIsWUFBQUEsT0FBTyxDQUFDb0IsSUFBUixDQUFjUCxRQUFRLENBQUNMLElBQVQsQ0FBY2EsT0FBNUIsRUFBc0NkLFFBQXRDLENBQWdELCtCQUErQk0sUUFBUSxDQUFDTCxJQUFULENBQWNjLGFBQTdGOztBQUNBLGdCQUFLLElBQUlwQixPQUFPLENBQUNxQixNQUFqQixFQUEwQjtBQUN6QnJCLGNBQUFBLE9BQU8sQ0FBQ2dCLElBQVIsQ0FBYyxVQUFkLEVBQTBCLElBQTFCO0FBQ0E7O0FBQ0Q5QixZQUFBQSxDQUFDLENBQUUsbUJBQUYsQ0FBRCxDQUF5Qm9DLEdBQXpCLENBQThCekIsT0FBOUIsRUFBd0NXLEdBQXhDLENBQTZDRyxRQUFRLENBQUNMLElBQVQsQ0FBY08sWUFBM0QsRUFBMEVVLElBQTFFLENBQWdGLFVBQWhGLEVBQTRGLElBQTVGO0FBQ0EsV0FSRCxNQVFPO0FBQ047QUFDQTtBQUNBLGdCQUFLLGdCQUFnQixPQUFPWixRQUFRLENBQUNMLElBQVQsQ0FBY2tCLHFCQUExQyxFQUFrRTtBQUNqRSxrQkFBSyxPQUFPYixRQUFRLENBQUNMLElBQVQsQ0FBY1EsWUFBMUIsRUFBeUM7QUFDeENqQixnQkFBQUEsT0FBTyxDQUFDNEIsSUFBUjtBQUNBNUIsZ0JBQUFBLE9BQU8sQ0FBQ1csR0FBUixDQUFhRyxRQUFRLENBQUNMLElBQVQsQ0FBY08sWUFBM0IsRUFBMENULElBQTFDLENBQWdETyxRQUFRLENBQUNMLElBQVQsQ0FBY1EsWUFBOUQsRUFBNkVYLFdBQTdFLENBQTBGLG1CQUExRixFQUFnSEUsUUFBaEgsQ0FBMEhNLFFBQVEsQ0FBQ0wsSUFBVCxDQUFjUyxZQUF4SSxFQUF1SkMsSUFBdkosQ0FBNkpMLFFBQVEsQ0FBQ0wsSUFBVCxDQUFjVyxXQUEzSyxFQUF3TCxJQUF4TDtBQUNBLGVBSEQsTUFHTztBQUNOcEIsZ0JBQUFBLE9BQU8sQ0FBQzZCLElBQVI7QUFDQTtBQUNELGFBUEQsTUFPTztBQUNOeEMsY0FBQUEsQ0FBQyxDQUFFLFFBQUYsRUFBWWMsT0FBWixDQUFELENBQXVCMkIsSUFBdkIsQ0FBNkIsVUFBVUMsQ0FBVixFQUFjO0FBQzFDLG9CQUFLMUMsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVc0IsR0FBVixPQUFvQkcsUUFBUSxDQUFDTCxJQUFULENBQWNrQixxQkFBdkMsRUFBK0Q7QUFDOUR0QyxrQkFBQUEsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVMkMsTUFBVjtBQUNBO0FBQ0QsZUFKRDs7QUFLQSxrQkFBSyxPQUFPbEIsUUFBUSxDQUFDTCxJQUFULENBQWNRLFlBQTFCLEVBQXlDO0FBQ3hDakIsZ0JBQUFBLE9BQU8sQ0FBQzRCLElBQVI7QUFDQTVCLGdCQUFBQSxPQUFPLENBQUNXLEdBQVIsQ0FBYUcsUUFBUSxDQUFDTCxJQUFULENBQWNPLFlBQTNCLEVBQTBDVCxJQUExQyxDQUFnRE8sUUFBUSxDQUFDTCxJQUFULENBQWNRLFlBQTlELEVBQTZFWCxXQUE3RSxDQUEwRixtQkFBMUYsRUFBZ0hFLFFBQWhILENBQTBITSxRQUFRLENBQUNMLElBQVQsQ0FBY1MsWUFBeEksRUFBdUpDLElBQXZKLENBQTZKTCxRQUFRLENBQUNMLElBQVQsQ0FBY1csV0FBM0ssRUFBd0wsSUFBeEw7QUFDQSxlQUhELE1BR087QUFDTnBCLGdCQUFBQSxPQUFPLENBQUM2QixJQUFSO0FBQ0E7QUFDRCxhQXRCSyxDQXVCTjs7O0FBQ0h4QyxZQUFBQSxDQUFDLENBQUUsbUJBQUYsQ0FBRCxDQUF5Qm9DLEdBQXpCLENBQThCekIsT0FBOUIsRUFBd0NNLFdBQXhDLENBQXFELG1CQUFyRDtBQUNHTCxZQUFBQSxPQUFPLENBQUNvQixJQUFSLENBQWNQLFFBQVEsQ0FBQ0wsSUFBVCxDQUFjYSxPQUE1QixFQUFzQ2QsUUFBdEMsQ0FBZ0QsK0JBQStCTSxRQUFRLENBQUNMLElBQVQsQ0FBY2MsYUFBN0Y7QUFDQTtBQUVKLFNBdENFO0FBdUNBO0FBQ0osS0F0RUQ7QUF1RUE7O0FBRURsQyxFQUFBQSxDQUFDLENBQUU0QyxRQUFGLENBQUQsQ0FBY0MsS0FBZCxDQUFxQixZQUFXO0FBQy9CLFFBQUssSUFBSTdDLENBQUMsQ0FBRSw0QkFBRixDQUFELENBQWtDbUMsTUFBM0MsRUFBb0Q7QUFDbkRsQyxNQUFBQSxXQUFXO0FBQ1g7QUFDRCxHQUpEO0FBTUFELEVBQUFBLENBQUMsQ0FBRSxpQkFBRixDQUFELENBQXVCUSxLQUF2QixDQUE4QixVQUFVQyxLQUFWLEVBQWtCO0FBQy9DQSxJQUFBQSxLQUFLLENBQUNDLGNBQU47QUFDQUwsSUFBQUEsUUFBUSxDQUFDQyxNQUFUO0FBQ0EsR0FIRDtBQUtBLENBM0ZELEVBMkZLd0MsTUEzRkw7OztBQ0FBO0FBQ0E7O0FBQUMsQ0FBQyxVQUFXOUMsQ0FBWCxFQUFjK0MsTUFBZCxFQUFzQkgsUUFBdEIsRUFBZ0NJLFNBQWhDLEVBQTRDO0FBRTdDO0FBQ0EsTUFBSUMsVUFBVSxHQUFHLG9CQUFqQjtBQUFBLE1BQ0FDLFFBQVEsR0FBRztBQUNWLGFBQVUsS0FEQTtBQUNPO0FBQ2pCLGtDQUErQixzQkFGckI7QUFHVixxQ0FBa0MsK0NBSHhCO0FBSVYsOEJBQTJCLGVBSmpCO0FBS1Ysa0JBQWUsVUFMTDtBQU1WLDBCQUF1QixrQkFOYjtBQU9WLHNCQUFtQixjQVBUO0FBUVYscUJBQWtCLFlBUlI7QUFTVixvQ0FBaUMsbUNBVHZCO0FBVVYseUNBQXNDLFFBVjVCO0FBV1Ysd0JBQXFCLDZCQVhYO0FBWVYsOEJBQTJCLDRCQVpqQjtBQWFWLHFDQUFrQyx1QkFieEI7QUFjVixxQkFBa0IsdUJBZFI7QUFlVixxQ0FBa0MsaUJBZnhCO0FBZ0JWLHdDQUFxQyx3QkFoQjNCO0FBaUJWLGlDQUE4QjtBQWpCcEIsR0FEWCxDQUg2QyxDQXNCMUM7QUFFSDs7QUFDQSxXQUFTQyxNQUFULENBQWlCQyxPQUFqQixFQUEwQkMsT0FBMUIsRUFBb0M7QUFFbkMsU0FBS0QsT0FBTCxHQUFlQSxPQUFmLENBRm1DLENBSW5DO0FBQ0E7QUFDQTtBQUNBOztBQUNBLFNBQUtDLE9BQUwsR0FBZXJELENBQUMsQ0FBQ3NELE1BQUYsQ0FBVSxFQUFWLEVBQWNKLFFBQWQsRUFBd0JHLE9BQXhCLENBQWY7QUFFQSxTQUFLRSxTQUFMLEdBQWlCTCxRQUFqQjtBQUNBLFNBQUtNLEtBQUwsR0FBYVAsVUFBYjtBQUVBLFNBQUtRLElBQUw7QUFDQSxHQXZDNEMsQ0F1QzNDOzs7QUFFRk4sRUFBQUEsTUFBTSxDQUFDTyxTQUFQLEdBQW1CO0FBRWxCRCxJQUFBQSxJQUFJLEVBQUUsY0FBVUUsS0FBVixFQUFpQkMsTUFBakIsRUFBMEI7QUFDL0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBS0MsY0FBTCxDQUFxQixLQUFLVCxPQUExQixFQUFtQyxLQUFLQyxPQUF4QztBQUNBLFdBQUtTLFlBQUwsQ0FBbUIsS0FBS1YsT0FBeEIsRUFBaUMsS0FBS0MsT0FBdEM7QUFDQSxXQUFLVSxlQUFMLENBQXNCLEtBQUtYLE9BQTNCLEVBQW9DLEtBQUtDLE9BQXpDO0FBQ0EsV0FBS1csVUFBTCxDQUFpQixLQUFLWixPQUF0QixFQUErQixLQUFLQyxPQUFwQztBQUNBLEtBYmlCO0FBZWxCWSxJQUFBQSxtQkFBbUIsRUFBRSw2QkFBVTdELElBQVYsRUFBZ0I4RCxRQUFoQixFQUEwQkMsTUFBMUIsRUFBa0NDLEtBQWxDLEVBQXlDQyxLQUF6QyxFQUFpRDtBQUNyRSxVQUFLLE9BQU9DLEVBQVAsS0FBYyxXQUFuQixFQUFpQztBQUNoQyxZQUFLLE9BQU9ELEtBQVAsS0FBaUIsV0FBdEIsRUFBb0M7QUFDbkNDLFVBQUFBLEVBQUUsQ0FBRSxNQUFGLEVBQVVsRSxJQUFWLEVBQWdCOEQsUUFBaEIsRUFBMEJDLE1BQTFCLEVBQWtDQyxLQUFsQyxDQUFGO0FBQ0EsU0FGRCxNQUVPO0FBQ05FLFVBQUFBLEVBQUUsQ0FBRSxNQUFGLEVBQVVsRSxJQUFWLEVBQWdCOEQsUUFBaEIsRUFBMEJDLE1BQTFCLEVBQWtDQyxLQUFsQyxFQUF5Q0MsS0FBekMsQ0FBRjtBQUNBO0FBQ0QsT0FORCxNQU1PO0FBQ047QUFDQTtBQUNELEtBekJpQjtBQXlCZjtBQUVIUixJQUFBQSxjQUFjLEVBQUUsd0JBQVVULE9BQVYsRUFBbUJDLE9BQW5CLEVBQTZCO0FBQzVDckQsTUFBQUEsQ0FBQyxDQUFDLDhCQUFELEVBQWlDb0QsT0FBakMsQ0FBRCxDQUEyQzVDLEtBQTNDLENBQWlELFVBQVMrRCxDQUFULEVBQVk7QUFDekQsWUFBSUMsTUFBTSxHQUFHeEUsQ0FBQyxDQUFDdUUsQ0FBQyxDQUFDQyxNQUFILENBQWQ7O0FBQ0EsWUFBSUEsTUFBTSxDQUFDM0QsTUFBUCxDQUFjLGdCQUFkLEVBQWdDc0IsTUFBaEMsSUFBMEMsQ0FBMUMsSUFBK0M5QixRQUFRLENBQUNvRSxRQUFULENBQWtCQyxPQUFsQixDQUEwQixLQUExQixFQUFnQyxFQUFoQyxLQUF1QyxLQUFLRCxRQUFMLENBQWNDLE9BQWQsQ0FBc0IsS0FBdEIsRUFBNEIsRUFBNUIsQ0FBdEYsSUFBeUhyRSxRQUFRLENBQUNzRSxRQUFULElBQXFCLEtBQUtBLFFBQXZKLEVBQWlLO0FBQ2hLLGNBQUlILE1BQU0sR0FBR3hFLENBQUMsQ0FBQyxLQUFLNEUsSUFBTixDQUFkO0FBQ0FKLFVBQUFBLE1BQU0sR0FBR0EsTUFBTSxDQUFDckMsTUFBUCxHQUFnQnFDLE1BQWhCLEdBQXlCeEUsQ0FBQyxDQUFDLFdBQVcsS0FBSzRFLElBQUwsQ0FBVUMsS0FBVixDQUFnQixDQUFoQixDQUFYLEdBQStCLEdBQWhDLENBQW5DOztBQUNILGNBQUlMLE1BQU0sQ0FBQ3JDLE1BQVgsRUFBbUI7QUFDbEJuQyxZQUFBQSxDQUFDLENBQUMsV0FBRCxDQUFELENBQWU4RSxPQUFmLENBQXVCO0FBQ3RCQyxjQUFBQSxTQUFTLEVBQUVQLE1BQU0sQ0FBQ1EsTUFBUCxHQUFnQkM7QUFETCxhQUF2QixFQUVHLElBRkg7QUFHQSxtQkFBTyxLQUFQO0FBQ0E7QUFDRDtBQUNELE9BWkQ7QUFhQSxLQXpDaUI7QUF5Q2Y7QUFFSG5CLElBQUFBLFlBQVksRUFBRSxzQkFBVVYsT0FBVixFQUFtQkMsT0FBbkIsRUFBNkI7QUFDMUMsVUFBSTZCLElBQUksR0FBRyxJQUFYO0FBQ0EsVUFBSUMsZUFBZSxHQUFHLEVBQXRCO0FBQ0EsVUFBSXZCLE1BQU0sR0FBRyxDQUFiO0FBQ0EsVUFBSXdCLEtBQUssR0FBRyxFQUFaO0FBQ0EsVUFBSUMsWUFBWSxHQUFHLENBQW5CO0FBQ0EsVUFBSUMsZ0JBQWdCLEdBQUcsRUFBdkI7QUFDQSxVQUFJQyxTQUFTLEdBQUcsRUFBaEI7QUFDQSxVQUFJQyxjQUFjLEdBQUcsRUFBckI7O0FBQ0EsVUFBSyxPQUFPQyx3QkFBUCxLQUFvQyxXQUFwQyxJQUFtRHpGLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ3FDLGtCQUFWLENBQUQsQ0FBZ0N2RCxNQUFoQyxHQUF5QyxDQUFqRyxFQUFxRztBQUNwR2dELFFBQUFBLGVBQWUsR0FBR00sd0JBQXdCLENBQUNFLFlBQXpCLENBQXNDUixlQUF4RDtBQUNBOztBQUNELFVBQUtuRixDQUFDLENBQUVxRCxPQUFPLENBQUN1QywwQkFBVixDQUFELENBQXdDekQsTUFBeEMsR0FBaUQsQ0FBdEQsRUFBMEQ7QUFDekR5QixRQUFBQSxNQUFNLEdBQUc1RCxDQUFDLENBQUVxRCxPQUFPLENBQUN1QywwQkFBVixDQUFELENBQXdDdEUsR0FBeEMsRUFBVDtBQUNBZ0UsUUFBQUEsZ0JBQWdCLEdBQUd0RixDQUFDLENBQUNxRCxPQUFPLENBQUN3Qyw2QkFBUixHQUF3QyxVQUF6QyxDQUFELENBQXNEdkUsR0FBdEQsRUFBbkI7QUFDQWlFLFFBQUFBLFNBQVMsR0FBR0QsZ0JBQWdCLENBQUNRLEtBQWpCLENBQXVCLEtBQXZCLEVBQThCLENBQTlCLENBQVo7QUFDQU4sUUFBQUEsY0FBYyxHQUFHRixnQkFBZ0IsQ0FBQ1EsS0FBakIsQ0FBdUIsS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBakI7QUFFR1YsUUFBQUEsS0FBSyxHQUFHRixJQUFJLENBQUNhLFVBQUwsQ0FBaUJuQyxNQUFqQixFQUF5QjJCLFNBQXpCLEVBQW9DQyxjQUFwQyxFQUFvREwsZUFBcEQsRUFBcUUvQixPQUFyRSxFQUE4RUMsT0FBOUUsQ0FBUjtBQUNBNkIsUUFBQUEsSUFBSSxDQUFDYyxZQUFMLENBQW1CNUMsT0FBbkIsRUFBNEJDLE9BQTVCLEVBQXFDK0IsS0FBckM7QUFFQXBGLFFBQUFBLENBQUMsQ0FBQ3FELE9BQU8sQ0FBQ3dDLDZCQUFULENBQUQsQ0FBeUNJLE1BQXpDLENBQWlELFlBQVc7QUFFM0RYLFVBQUFBLGdCQUFnQixHQUFHdEYsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDd0MsNkJBQVIsR0FBd0MsVUFBMUMsQ0FBRCxDQUF1RHZFLEdBQXZELEVBQW5CO0FBQ0hpRSxVQUFBQSxTQUFTLEdBQUdELGdCQUFnQixDQUFDUSxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFaO0FBQ0FOLFVBQUFBLGNBQWMsR0FBR0YsZ0JBQWdCLENBQUNRLEtBQWpCLENBQXVCLEtBQXZCLEVBQThCLENBQTlCLENBQWpCO0FBRUlWLFVBQUFBLEtBQUssR0FBR0YsSUFBSSxDQUFDYSxVQUFMLENBQWlCL0YsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDdUMsMEJBQVYsQ0FBRCxDQUF3Q3RFLEdBQXhDLEVBQWpCLEVBQWdFdEIsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDd0MsNkJBQVIsR0FBd0MsVUFBMUMsQ0FBRCxDQUF3RHhELElBQXhELENBQThELHFCQUE5RCxDQUFoRSxFQUF1Sm1ELGNBQXZKLEVBQXVLTCxlQUF2SyxFQUF3TC9CLE9BQXhMLEVBQWlNQyxPQUFqTSxDQUFSO0FBQ0E2QixVQUFBQSxJQUFJLENBQUNjLFlBQUwsQ0FBbUI1QyxPQUFuQixFQUE0QkMsT0FBNUIsRUFBcUMrQixLQUFyQztBQUNELFNBUkQ7QUFVQXBGLFFBQUFBLENBQUMsQ0FBQ3FELE9BQU8sQ0FBQ3VDLDBCQUFULENBQUQsQ0FBc0NNLElBQXRDLENBQTJDLGVBQTNDLEVBQTRELFlBQVc7QUFDdEVaLFVBQUFBLGdCQUFnQixHQUFHdEYsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDd0MsNkJBQVIsR0FBd0MsVUFBMUMsQ0FBRCxDQUF1RHZFLEdBQXZELEVBQW5CO0FBQ0hpRSxVQUFBQSxTQUFTLEdBQUdELGdCQUFnQixDQUFDUSxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFaO0FBQ0FOLFVBQUFBLGNBQWMsR0FBR0YsZ0JBQWdCLENBQUNRLEtBQWpCLENBQXVCLEtBQXZCLEVBQThCLENBQTlCLENBQWpCOztBQUNJLGNBQUc5RixDQUFDLENBQUMsSUFBRCxDQUFELENBQVFvQixJQUFSLENBQWEsWUFBYixLQUE4QnBCLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUXNCLEdBQVIsRUFBakMsRUFBZ0Q7QUFDOUN0QixZQUFBQSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFvQixJQUFSLENBQWEsWUFBYixFQUEyQnBCLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUXNCLEdBQVIsRUFBM0I7QUFDQThELFlBQUFBLEtBQUssR0FBR0YsSUFBSSxDQUFDYSxVQUFMLENBQWlCL0YsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDdUMsMEJBQVYsQ0FBRCxDQUF3Q3RFLEdBQXhDLEVBQWpCLEVBQWdFdEIsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDd0MsNkJBQVIsR0FBd0MsVUFBMUMsQ0FBRCxDQUF3RHhELElBQXhELENBQThELHFCQUE5RCxDQUFoRSxFQUF1Sm1ELGNBQXZKLEVBQXVLTCxlQUF2SyxFQUF3TC9CLE9BQXhMLEVBQWlNQyxPQUFqTSxDQUFSO0FBQ0E2QixZQUFBQSxJQUFJLENBQUNjLFlBQUwsQ0FBbUI1QyxPQUFuQixFQUE0QkMsT0FBNUIsRUFBcUMrQixLQUFyQztBQUNEOztBQUFBO0FBQ0YsU0FURDtBQVdIOztBQUNELFVBQUtwRixDQUFDLENBQUVxRCxPQUFPLENBQUM4QyxnQkFBVixDQUFELENBQThCaEUsTUFBOUIsR0FBdUMsQ0FBNUMsRUFBZ0Q7QUFDL0NuQyxRQUFBQSxDQUFDLENBQUVxRCxPQUFPLENBQUMrQyw2QkFBVixFQUF5Q2hELE9BQXpDLENBQUQsQ0FBb0RYLElBQXBELENBQXlELFlBQVc7QUFDbkV6QyxVQUFBQSxDQUFDLENBQUVxRCxPQUFPLENBQUNnRCxhQUFWLEVBQXlCckcsQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ3NHLE9BQXBDLENBQTZDLHdCQUE3QztBQUNBLFNBRkQ7QUFHQXRHLFFBQUFBLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ2tELDRCQUFWLEVBQXdDbkQsT0FBeEMsQ0FBRCxDQUFtRG9ELEVBQW5ELENBQXNELFFBQXRELEVBQWdFLFVBQVUvRixLQUFWLEVBQWlCO0FBQ2hGNEUsVUFBQUEsWUFBWSxHQUFHckYsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRb0IsSUFBUixDQUFhLHFCQUFiLENBQWY7QUFDQWtFLFVBQUFBLGdCQUFnQixHQUFHdEYsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRc0IsR0FBUixFQUFuQjtBQUNBaUUsVUFBQUEsU0FBUyxHQUFHRCxnQkFBZ0IsQ0FBQ1EsS0FBakIsQ0FBdUIsS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBWjtBQUNBTixVQUFBQSxjQUFjLEdBQUdGLGdCQUFnQixDQUFDUSxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFqQjs7QUFDRyxjQUFLLE9BQU9ULFlBQVAsS0FBd0IsV0FBN0IsRUFBMkM7QUFFN0NyRixZQUFBQSxDQUFDLENBQUVxRCxPQUFPLENBQUMrQyw2QkFBVixFQUF5Q2hELE9BQXpDLENBQUQsQ0FBbURuQyxXQUFuRCxDQUFnRSxTQUFoRTtBQUNBakIsWUFBQUEsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDb0Qsc0JBQVYsRUFBa0NyRCxPQUFsQyxDQUFELENBQTRDbkMsV0FBNUMsQ0FBeUQsUUFBekQ7QUFDQWpCLFlBQUFBLENBQUMsQ0FBRVMsS0FBSyxDQUFDK0QsTUFBUixDQUFELENBQWtCa0MsT0FBbEIsQ0FBMkJyRCxPQUFPLENBQUMrQyw2QkFBbkMsRUFBbUVqRixRQUFuRSxDQUE2RSxTQUE3RTs7QUFFQSxnQkFBS29FLFNBQVMsSUFBSSxDQUFsQixFQUFzQjtBQUNyQnZGLGNBQUFBLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ3NELHlCQUFWLEVBQXFDM0csQ0FBQyxDQUFFcUQsT0FBTyxDQUFDb0Qsc0JBQVIsR0FBaUMsR0FBakMsR0FBdUNwQixZQUF6QyxDQUF0QyxDQUFELENBQWlHL0QsR0FBakcsQ0FBc0d0QixDQUFDLENBQUVxRCxPQUFPLENBQUN1RCxhQUFWLEVBQXlCNUcsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDb0Qsc0JBQVIsR0FBaUMsR0FBakMsR0FBdUNwQixZQUF6QyxDQUExQixDQUFELENBQXFGakUsSUFBckYsQ0FBMEYsZ0JBQTFGLENBQXRHO0FBQ0EsYUFGRCxNQUVPLElBQUttRSxTQUFTLElBQUksRUFBbEIsRUFBdUI7QUFDN0J2RixjQUFBQSxDQUFDLENBQUVxRCxPQUFPLENBQUNzRCx5QkFBVixFQUFxQzNHLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ29ELHNCQUFSLEdBQWlDLEdBQWpDLEdBQXVDcEIsWUFBekMsQ0FBdEMsQ0FBRCxDQUFpRy9ELEdBQWpHLENBQXNHdEIsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDdUQsYUFBVixFQUF5QjVHLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ29ELHNCQUFSLEdBQWlDLEdBQWpDLEdBQXVDcEIsWUFBekMsQ0FBMUIsQ0FBRCxDQUFxRmpFLElBQXJGLENBQTBGLGlCQUExRixDQUF0RztBQUNBOztBQUVEd0MsWUFBQUEsTUFBTSxHQUFHNUQsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDc0QseUJBQVIsR0FBb0MsNkJBQXBDLEdBQW9FdEIsWUFBcEUsR0FBbUYsSUFBckYsQ0FBRCxDQUE0Ri9ELEdBQTVGLEVBQVQ7QUFFQThELFlBQUFBLEtBQUssR0FBR0YsSUFBSSxDQUFDYSxVQUFMLENBQWlCbkMsTUFBakIsRUFBeUIyQixTQUF6QixFQUFvQ0MsY0FBcEMsRUFBb0RMLGVBQXBELEVBQXFFL0IsT0FBckUsRUFBOEVDLE9BQTlFLENBQVI7QUFDQTZCLFlBQUFBLElBQUksQ0FBQzJCLGVBQUwsQ0FBc0J2QixnQkFBdEIsRUFBd0NGLEtBQUssQ0FBQyxNQUFELENBQTdDLEVBQXVEaEMsT0FBdkQsRUFBZ0VDLE9BQWhFO0FBRUEsV0FqQkUsTUFpQkksSUFBS3JELENBQUMsQ0FBRXFELE9BQU8sQ0FBQ3lELDZCQUFWLENBQUQsQ0FBMkMzRSxNQUEzQyxHQUFvRCxDQUF6RCxFQUE2RDtBQUNuRW5DLFlBQUFBLENBQUMsQ0FBQ3FELE9BQU8sQ0FBQ3lELDZCQUFULEVBQXdDMUQsT0FBeEMsQ0FBRCxDQUFrRGxDLElBQWxELENBQXVEc0UsY0FBdkQ7QUFDQXhGLFlBQUFBLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ29ELHNCQUFWLENBQUQsQ0FBb0NoRSxJQUFwQyxDQUEwQyxZQUFXO0FBQ3BENEMsY0FBQUEsWUFBWSxHQUFHckYsQ0FBQyxDQUFDcUQsT0FBTyxDQUFDc0QseUJBQVQsRUFBb0MzRyxDQUFDLENBQUMsSUFBRCxDQUFyQyxDQUFELENBQThDb0IsSUFBOUMsQ0FBbUQscUJBQW5ELENBQWY7O0FBQ0Esa0JBQUssT0FBT2lFLFlBQVAsS0FBd0IsV0FBN0IsRUFBMkM7QUFDMUN6QixnQkFBQUEsTUFBTSxHQUFHNUQsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDc0QseUJBQVYsRUFBcUMzRyxDQUFDLENBQUMsSUFBRCxDQUF0QyxDQUFELENBQWdEc0IsR0FBaEQsRUFBVDtBQUNBOEQsZ0JBQUFBLEtBQUssR0FBR0YsSUFBSSxDQUFDYSxVQUFMLENBQWlCbkMsTUFBakIsRUFBeUIyQixTQUF6QixFQUFvQ0MsY0FBcEMsRUFBb0RMLGVBQXBELEVBQXFFL0IsT0FBckUsRUFBOEVDLE9BQTlFLENBQVI7QUFDQTtBQUNELGFBTkQ7QUFPQTs7QUFFRDZCLFVBQUFBLElBQUksQ0FBQzZCLG1CQUFMLENBQTBCekIsZ0JBQTFCLEVBQTRDRixLQUFLLENBQUMsTUFBRCxDQUFqRCxFQUEyRGhDLE9BQTNELEVBQW9FQyxPQUFwRTtBQUVBLFNBbkNEO0FBb0NBOztBQUNELFVBQUtyRCxDQUFDLENBQUVxRCxPQUFPLENBQUMyRCxnQ0FBVixDQUFELENBQThDN0UsTUFBOUMsR0FBdUQsQ0FBNUQsRUFBZ0U7QUFDL0RuQyxRQUFBQSxDQUFDLENBQUVxRCxPQUFPLENBQUMyRCxnQ0FBVixFQUE0QzVELE9BQTVDLENBQUQsQ0FBdUQ1QyxLQUF2RCxDQUE4RCxVQUFVQyxLQUFWLEVBQWtCO0FBQy9FNEUsVUFBQUEsWUFBWSxHQUFHckYsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDa0QsNEJBQVYsRUFBd0NuRCxPQUF4QyxDQUFELENBQW1EaEMsSUFBbkQsQ0FBd0QscUJBQXhELENBQWY7QUFDQXBCLFVBQUFBLENBQUMsQ0FBRXFELE9BQU8sQ0FBQytDLDZCQUFWLEVBQXlDaEQsT0FBekMsQ0FBRCxDQUFtRG5DLFdBQW5ELENBQWdFLFNBQWhFO0FBQ0FqQixVQUFBQSxDQUFDLENBQUVxRCxPQUFPLENBQUNvRCxzQkFBVixFQUFrQ3JELE9BQWxDLENBQUQsQ0FBNENuQyxXQUE1QyxDQUF5RCxRQUF6RDtBQUNBakIsVUFBQUEsQ0FBQyxDQUFFUyxLQUFLLENBQUMrRCxNQUFSLENBQUQsQ0FBa0JrQyxPQUFsQixDQUEyQnJELE9BQU8sQ0FBQytDLDZCQUFuQyxFQUFtRWpGLFFBQW5FLENBQTZFLFNBQTdFO0FBQ0FtRSxVQUFBQSxnQkFBZ0IsR0FBR3RGLENBQUMsQ0FBQ3FELE9BQU8sQ0FBQ2tELDRCQUFULEVBQXVDdkcsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRYSxNQUFSLEVBQXZDLENBQUQsQ0FBMkRTLEdBQTNELEVBQW5CO0FBQ0FpRSxVQUFBQSxTQUFTLEdBQUdELGdCQUFnQixDQUFDUSxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFaO0FBQ0FsQyxVQUFBQSxNQUFNLEdBQUc1RCxDQUFDLENBQUVxRCxPQUFPLENBQUNzRCx5QkFBUixHQUFvQyw2QkFBcEMsR0FBb0V0QixZQUFwRSxHQUFtRixJQUFyRixDQUFELENBQTRGL0QsR0FBNUYsRUFBVDtBQUNBOEQsVUFBQUEsS0FBSyxHQUFHRixJQUFJLENBQUNhLFVBQUwsQ0FBaUJuQyxNQUFqQixFQUF5QjJCLFNBQXpCLEVBQW9DQyxjQUFwQyxFQUFvREwsZUFBcEQsRUFBcUUvQixPQUFyRSxFQUE4RUMsT0FBOUUsQ0FBUjtBQUNBNUMsVUFBQUEsS0FBSyxDQUFDQyxjQUFOO0FBQ0EsU0FWRDtBQVdBO0FBQ0QsS0E1SWlCO0FBNElmO0FBRUhxRixJQUFBQSxVQUFVLEVBQUUsb0JBQVVuQyxNQUFWLEVBQWtCMkIsU0FBbEIsRUFBNkJuRixJQUE3QixFQUFtQytFLGVBQW5DLEVBQW9EL0IsT0FBcEQsRUFBNkRDLE9BQTdELEVBQXVFO0FBQ2pGLFVBQUk0RCxRQUFRLEdBQUdDLFFBQVEsQ0FBRXRELE1BQUYsQ0FBUixHQUFxQnNELFFBQVEsQ0FBRTNCLFNBQUYsQ0FBNUM7QUFDQSxVQUFJSCxLQUFLLEdBQUcsRUFBWjs7QUFDQSxVQUFLLE9BQU9ELGVBQVAsS0FBMkIsV0FBM0IsSUFBMENBLGVBQWUsS0FBSyxFQUFuRSxFQUF3RTtBQUN0RSxZQUFJZ0MsaUJBQWlCLEdBQUdELFFBQVEsQ0FBRS9CLGVBQWUsQ0FBQ2lDLHdCQUFsQixDQUFoQztBQUNBLFlBQUlDLGtCQUFrQixHQUFHSCxRQUFRLENBQUUvQixlQUFlLENBQUNtQyx5QkFBbEIsQ0FBakM7QUFDQSxZQUFJQyx1QkFBdUIsR0FBR0wsUUFBUSxDQUFFL0IsZUFBZSxDQUFDb0MsdUJBQWxCLENBQXRDLENBSHNFLENBSXRFOztBQUNBLFlBQUtuSCxJQUFJLEtBQUssVUFBZCxFQUEyQjtBQUN6QitHLFVBQUFBLGlCQUFpQixJQUFJRixRQUFyQjtBQUNELFNBRkQsTUFFTztBQUNMTSxVQUFBQSx1QkFBdUIsSUFBSU4sUUFBM0I7QUFDRDs7QUFFREEsUUFBQUEsUUFBUSxHQUFHTyxJQUFJLENBQUNDLEdBQUwsQ0FBVU4saUJBQVYsRUFBNkJFLGtCQUE3QixFQUFpREUsdUJBQWpELENBQVg7QUFDRDs7QUFFRG5DLE1BQUFBLEtBQUssR0FBRyxLQUFLc0MsUUFBTCxDQUFlVCxRQUFmLENBQVI7QUFFQWpILE1BQUFBLENBQUMsQ0FBQyxJQUFELEVBQU9xRCxPQUFPLENBQUMrQyw2QkFBZixDQUFELENBQStDM0QsSUFBL0MsQ0FBcUQsWUFBVztBQUM5RCxZQUFLekMsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRa0IsSUFBUixNQUFrQmtFLEtBQUssQ0FBQyxNQUFELENBQTVCLEVBQXVDO0FBQ3JDcEYsVUFBQUEsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDb0Qsc0JBQVYsRUFBa0NyRCxPQUFsQyxDQUFELENBQTRDbkMsV0FBNUMsQ0FBeUQsUUFBekQ7QUFDQWpCLFVBQUFBLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUWEsTUFBUixHQUFpQkEsTUFBakIsR0FBMEJNLFFBQTFCLENBQW9DLFFBQXBDO0FBQ0Q7QUFDRixPQUxEO0FBTUEsYUFBT2lFLEtBQVA7QUFFRCxLQXpLaUI7QUF5S2Y7QUFFSHNDLElBQUFBLFFBQVEsRUFBRSxrQkFBVVQsUUFBVixFQUFxQjtBQUM5QixVQUFJN0IsS0FBSyxHQUFHLEVBQVo7O0FBQ0EsVUFBSzZCLFFBQVEsR0FBRyxDQUFYLElBQWdCQSxRQUFRLEdBQUcsRUFBaEMsRUFBcUM7QUFDcEM3QixRQUFBQSxLQUFLLENBQUMsTUFBRCxDQUFMLEdBQWdCLFFBQWhCO0FBQ0FBLFFBQUFBLEtBQUssQ0FBQyxRQUFELENBQUwsR0FBa0IsQ0FBbEI7QUFDQSxPQUhELE1BSUssSUFBSTZCLFFBQVEsR0FBRyxFQUFYLElBQWlCQSxRQUFRLEdBQUcsR0FBaEMsRUFBcUM7QUFDekM3QixRQUFBQSxLQUFLLENBQUMsTUFBRCxDQUFMLEdBQWdCLFFBQWhCO0FBQ0FBLFFBQUFBLEtBQUssQ0FBQyxRQUFELENBQUwsR0FBa0IsQ0FBbEI7QUFDQSxPQUhJLE1BR0UsSUFBSTZCLFFBQVEsR0FBRyxHQUFYLElBQWtCQSxRQUFRLEdBQUcsR0FBakMsRUFBc0M7QUFDNUM3QixRQUFBQSxLQUFLLENBQUMsTUFBRCxDQUFMLEdBQWdCLE1BQWhCO0FBQ0FBLFFBQUFBLEtBQUssQ0FBQyxRQUFELENBQUwsR0FBa0IsQ0FBbEI7QUFDQSxPQUhNLE1BR0EsSUFBSTZCLFFBQVEsR0FBRyxHQUFmLEVBQW9CO0FBQzFCN0IsUUFBQUEsS0FBSyxDQUFDLE1BQUQsQ0FBTCxHQUFnQixVQUFoQjtBQUNBQSxRQUFBQSxLQUFLLENBQUMsUUFBRCxDQUFMLEdBQWtCLENBQWxCO0FBQ0E7O0FBQ0QsYUFBT0EsS0FBUDtBQUNBLEtBNUxpQjtBQTRMZjtBQUVIWSxJQUFBQSxZQUFZLEVBQUUsc0JBQVU1QyxPQUFWLEVBQW1CQyxPQUFuQixFQUE0QitCLEtBQTVCLEVBQW9DO0FBQ2pELFVBQUl1QyxtQkFBbUIsR0FBRyxFQUExQjtBQUNBLFVBQUlDLFNBQVMsR0FBRyxFQUFoQjtBQUNBLFVBQUlDLCtCQUErQixHQUFHeEUsT0FBTyxDQUFDeUUsc0JBQTlDLENBSGlELENBR3FCOztBQUN0RSxVQUFJQyxnQkFBZ0IsR0FBRyxTQUFuQkEsZ0JBQW1CLENBQVVDLEdBQVYsRUFBZ0I7QUFDdEMsZUFBT0EsR0FBRyxDQUFDdEQsT0FBSixDQUFhLFdBQWIsRUFBMEIsVUFBVXVELEtBQVYsRUFBaUJDLEdBQWpCLEVBQXVCO0FBQ3ZELGlCQUFPQyxNQUFNLENBQUNDLFlBQVAsQ0FBcUJGLEdBQXJCLENBQVA7QUFDQSxTQUZNLENBQVA7QUFHQSxPQUpEOztBQUtBLFVBQUssT0FBT3pDLHdCQUFQLEtBQW9DLFdBQXpDLEVBQXVEO0FBQ3REa0MsUUFBQUEsbUJBQW1CLEdBQUdsQyx3QkFBd0IsQ0FBQ2tDLG1CQUEvQztBQUNBOztBQUVEM0gsTUFBQUEsQ0FBQyxDQUFDcUQsT0FBTyxDQUFDeUUsc0JBQVQsQ0FBRCxDQUFrQ2hHLElBQWxDLENBQXdDLE9BQXhDLEVBQWlELCtCQUErQnNELEtBQUssQ0FBQyxNQUFELENBQUwsQ0FBY2lELFdBQWQsRUFBaEY7O0FBRUEsVUFBS3JJLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ3FDLGtCQUFWLENBQUQsQ0FBZ0N2RCxNQUFoQyxHQUF5QyxDQUF6QyxJQUE4Q3NELHdCQUF3QixDQUFDRSxZQUF6QixDQUFzQzJDLFlBQXRDLENBQW1EbkcsTUFBbkQsR0FBNEQsQ0FBL0csRUFBbUg7QUFFbEgsWUFBSyxLQUFLbkMsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDeUUsc0JBQVYsQ0FBRCxDQUFvQzNGLE1BQXBDLEdBQTZDLENBQXZELEVBQTJEO0FBQzFEMEYsVUFBQUEsK0JBQStCLEdBQUd4RSxPQUFPLENBQUN5RSxzQkFBUixHQUFpQyxJQUFuRTtBQUNBOztBQUVERixRQUFBQSxTQUFTLEdBQUduQyx3QkFBd0IsQ0FBQ0UsWUFBekIsQ0FBc0MyQyxZQUF0QyxDQUFtRDVELE9BQW5ELENBQTREaUQsbUJBQTVELEVBQWlGLEVBQWpGLENBQVo7O0FBRUEsWUFBS0MsU0FBUyxLQUFLeEMsS0FBSyxDQUFDLE1BQUQsQ0FBTCxDQUFjaUQsV0FBZCxFQUFuQixFQUFpRDtBQUNoRHJJLFVBQUFBLENBQUMsQ0FBRTZILCtCQUFGLENBQUQsQ0FBcUM3RixJQUFyQyxDQUEyQytGLGdCQUFnQixDQUFFL0gsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDeUUsc0JBQVYsQ0FBRCxDQUFvQzFHLElBQXBDLENBQTBDLFNBQTFDLENBQUYsQ0FBM0Q7QUFDQSxTQUZELE1BRU87QUFDTnBCLFVBQUFBLENBQUMsQ0FBRTZILCtCQUFGLENBQUQsQ0FBcUM3RixJQUFyQyxDQUEyQytGLGdCQUFnQixDQUFFL0gsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDeUUsc0JBQVYsQ0FBRCxDQUFvQzFHLElBQXBDLENBQTBDLGFBQTFDLENBQUYsQ0FBM0Q7QUFDQTtBQUNEOztBQUVEcEIsTUFBQUEsQ0FBQyxDQUFDcUQsT0FBTyxDQUFDa0YsVUFBVCxFQUFxQmxGLE9BQU8sQ0FBQ3lFLHNCQUE3QixDQUFELENBQXNENUcsSUFBdEQsQ0FBNERrRSxLQUFLLENBQUMsTUFBRCxDQUFqRTtBQUVBLEtBOU5pQjtBQThOZjtBQUVIeUIsSUFBQUEsZUFBZSxFQUFFLHlCQUFVMkIsUUFBVixFQUFvQnBELEtBQXBCLEVBQTJCaEMsT0FBM0IsRUFBb0NDLE9BQXBDLEVBQThDO0FBQzlEckQsTUFBQUEsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDK0MsNkJBQVYsQ0FBRCxDQUEyQzNELElBQTNDLENBQWlELFlBQVc7QUFDM0QsWUFBSWdHLEtBQUssR0FBWXpJLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ3VELGFBQVYsRUFBeUI1RyxDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9Da0IsSUFBcEMsRUFBckI7QUFDQSxZQUFJd0gsV0FBVyxHQUFNMUksQ0FBQyxDQUFFcUQsT0FBTyxDQUFDdUQsYUFBVixFQUF5QjVHLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0NvQixJQUFwQyxDQUF5QyxPQUF6QyxDQUFyQjtBQUNHLFlBQUl1SCxVQUFVLEdBQU8zSSxDQUFDLENBQUVxRCxPQUFPLENBQUN1RCxhQUFWLEVBQXlCNUcsQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ29CLElBQXBDLENBQXlDLE1BQXpDLENBQXJCO0FBQ0EsWUFBSXdILFVBQVUsR0FBTzVJLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ3VELGFBQVYsRUFBeUI1RyxDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9Db0IsSUFBcEMsQ0FBeUMsVUFBekMsQ0FBckI7QUFDQSxZQUFJb0UsY0FBYyxHQUFHZ0QsUUFBUSxDQUFDMUMsS0FBVCxDQUFlLEtBQWYsRUFBc0IsQ0FBdEIsQ0FBckI7QUFDQSxZQUFJUCxTQUFTLEdBQVEyQixRQUFRLENBQUVzQixRQUFRLENBQUMxQyxLQUFULENBQWUsS0FBZixFQUFzQixDQUF0QixDQUFGLENBQTdCO0FBRUE5RixRQUFBQSxDQUFDLENBQUVxRCxPQUFPLENBQUNrRCw0QkFBVixDQUFELENBQTBDakYsR0FBMUMsQ0FBK0NrSCxRQUEvQztBQUNBeEksUUFBQUEsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDa0QsNEJBQVYsQ0FBRCxDQUEwQ3pFLElBQTFDLENBQWdELFVBQWhELEVBQTREMEcsUUFBNUQ7O0FBRUgsWUFBS2hELGNBQWMsSUFBSSxXQUF2QixFQUFxQztBQUNwQ2lELFVBQUFBLEtBQUssR0FBR0MsV0FBUjtBQUNBMUksVUFBQUEsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDdUQsYUFBVixFQUF5QjVHLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0NpQixXQUFwQyxDQUFpRCxTQUFqRDtBQUNBLFNBSEQsTUFHTyxJQUFLdUUsY0FBYyxJQUFJLFVBQXZCLEVBQW9DO0FBQzFDaUQsVUFBQUEsS0FBSyxHQUFHRSxVQUFSO0FBQ0EzSSxVQUFBQSxDQUFDLENBQUVxRCxPQUFPLENBQUN1RCxhQUFWLEVBQXlCNUcsQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ21CLFFBQXBDLENBQThDLFNBQTlDO0FBQ0EsU0FITSxNQUdBLElBQUlxRSxjQUFjLElBQUksVUFBdEIsRUFBbUM7QUFDekNpRCxVQUFBQSxLQUFLLEdBQUdHLFVBQVI7QUFDQTVJLFVBQUFBLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ3VELGFBQVYsRUFBeUI1RyxDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9DbUIsUUFBcEMsQ0FBNkMsU0FBN0M7QUFDQTs7QUFFRG5CLFFBQUFBLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ3VELGFBQVYsRUFBeUI1RyxDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9Da0IsSUFBcEMsQ0FBMEN1SCxLQUExQztBQUNHekksUUFBQUEsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDa0QsNEJBQVYsRUFBd0N2RyxDQUFDLENBQUMsSUFBRCxDQUF6QyxDQUFELENBQW1Eb0IsSUFBbkQsQ0FBeUQsV0FBekQsRUFBc0VtRSxTQUF0RTtBQUVILE9BekJEO0FBMEJBLEtBM1BpQjtBQTJQZjtBQUVId0IsSUFBQUEsbUJBQW1CLEVBQUUsNkJBQVV5QixRQUFWLEVBQW9CcEQsS0FBcEIsRUFBMkJoQyxPQUEzQixFQUFvQ0MsT0FBcEMsRUFBOEM7QUFDbEVyRCxNQUFBQSxDQUFDLENBQUVxRCxPQUFPLENBQUMrQyw2QkFBVixDQUFELENBQTJDM0QsSUFBM0MsQ0FBaUQsWUFBVztBQUMzRCxZQUFJZ0csS0FBSyxHQUFZekksQ0FBQyxDQUFFcUQsT0FBTyxDQUFDdUQsYUFBVixFQUF5QjVHLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0NrQixJQUFwQyxFQUFyQjtBQUNBLFlBQUl3SCxXQUFXLEdBQU0xSSxDQUFDLENBQUVxRCxPQUFPLENBQUN1RCxhQUFWLEVBQXlCNUcsQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ29CLElBQXBDLENBQXlDLE9BQXpDLENBQXJCO0FBQ0csWUFBSXVILFVBQVUsR0FBTzNJLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ3VELGFBQVYsRUFBeUI1RyxDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9Db0IsSUFBcEMsQ0FBeUMsTUFBekMsQ0FBckI7QUFDQSxZQUFJd0gsVUFBVSxHQUFPNUksQ0FBQyxDQUFFcUQsT0FBTyxDQUFDdUQsYUFBVixFQUF5QjVHLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0NvQixJQUFwQyxDQUF5QyxVQUF6QyxDQUFyQjtBQUNBLFlBQUlvRSxjQUFjLEdBQUdnRCxRQUFRLENBQUMxQyxLQUFULENBQWUsS0FBZixFQUFzQixDQUF0QixDQUFyQjs7QUFFSCxZQUFLTixjQUFjLElBQUksV0FBdkIsRUFBcUM7QUFDcENpRCxVQUFBQSxLQUFLLEdBQUdDLFdBQVI7QUFDQTFJLFVBQUFBLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ3VELGFBQVYsRUFBeUI1RyxDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9DaUIsV0FBcEMsQ0FBaUQsU0FBakQ7QUFDQSxTQUhELE1BR08sSUFBS3VFLGNBQWMsSUFBSSxVQUF2QixFQUFvQztBQUMxQ2lELFVBQUFBLEtBQUssR0FBR0UsVUFBUjtBQUNBM0ksVUFBQUEsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDdUQsYUFBVixFQUF5QjVHLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0NtQixRQUFwQyxDQUE4QyxTQUE5QztBQUNBLFNBSE0sTUFHQSxJQUFJcUUsY0FBYyxJQUFJLFVBQXRCLEVBQW1DO0FBQ3pDaUQsVUFBQUEsS0FBSyxHQUFHRyxVQUFSO0FBQ0E1SSxVQUFBQSxDQUFDLENBQUVxRCxPQUFPLENBQUN1RCxhQUFWLEVBQXlCNUcsQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ21CLFFBQXBDLENBQTZDLFNBQTdDO0FBQ0E7O0FBRURuQixRQUFBQSxDQUFDLENBQUVxRCxPQUFPLENBQUN1RCxhQUFWLEVBQXlCNUcsQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ2tCLElBQXBDLENBQTBDdUgsS0FBMUM7QUFFQSxPQXBCRDtBQXFCQSxLQW5SaUI7QUFtUmY7QUFFSDFFLElBQUFBLGVBQWUsRUFBRSx5QkFBVVgsT0FBVixFQUFtQkMsT0FBbkIsRUFBNkI7QUFDN0NyRCxNQUFBQSxDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCUSxLQUFsQixDQUF3QixZQUFXO0FBQ2xDLFlBQUlxSSxXQUFXLEdBQUc3SSxDQUFDLENBQUUsSUFBRixDQUFELENBQVU4QixJQUFWLENBQWdCLE9BQWhCLENBQWxCO0FBQ0EsWUFBSXVELFlBQVksR0FBR3dELFdBQVcsQ0FBQ0EsV0FBVyxDQUFDMUcsTUFBWixHQUFvQixDQUFyQixDQUE5QjtBQUNHbkMsUUFBQUEsQ0FBQyxDQUFFcUQsT0FBTyxDQUFDK0MsNkJBQVYsRUFBeUNoRCxPQUF6QyxDQUFELENBQW1EbkMsV0FBbkQsQ0FBZ0UsU0FBaEU7QUFDSGpCLFFBQUFBLENBQUMsQ0FBRXFELE9BQU8sQ0FBQ29ELHNCQUFWLEVBQWtDckQsT0FBbEMsQ0FBRCxDQUE0Q25DLFdBQTVDLENBQXlELFFBQXpEO0FBQ0dqQixRQUFBQSxDQUFDLENBQUVxRCxPQUFPLENBQUNvRCxzQkFBUixHQUFpQyxHQUFqQyxHQUF1Q3BCLFlBQXpDLEVBQXVEakMsT0FBdkQsQ0FBRCxDQUFrRWpDLFFBQWxFLENBQTRFLFFBQTVFO0FBQ0FuQixRQUFBQSxDQUFDLENBQUVxRCxPQUFPLENBQUNvRCxzQkFBUixHQUFpQyxHQUFqQyxHQUF1Q3BCLFlBQXZDLEdBQXNELEdBQXRELEdBQTREaEMsT0FBTyxDQUFDK0MsNkJBQXRFLENBQUQsQ0FBdUdqRixRQUF2RyxDQUFpSCxTQUFqSDtBQUNELE9BUEg7QUFRQSxLQTlSaUI7QUE4UmY7QUFFSDZDLElBQUFBLFVBQVUsRUFBRSxvQkFBVVosT0FBVixFQUFtQkMsT0FBbkIsRUFBNkI7QUFDeEMsVUFBSTZCLElBQUksR0FBRyxJQUFYO0FBQ0FsRixNQUFBQSxDQUFDLENBQUVvRCxPQUFGLENBQUQsQ0FBYTBGLE1BQWIsQ0FBcUIsVUFBVXJJLEtBQVYsRUFBa0I7QUFDdEN5RSxRQUFBQSxJQUFJLENBQUNqQixtQkFBTCxDQUEwQixPQUExQixFQUFtQyxZQUFuQyxFQUFpRCxpQkFBakQsRUFBb0U1RCxRQUFRLENBQUNvRSxRQUE3RTtBQUNBLE9BRkQ7QUFHQSxLQXJTaUIsQ0FxU2Y7O0FBclNlLEdBQW5CLENBekM2QyxDQWdWMUM7QUFFSDtBQUNBOztBQUNBekUsRUFBQUEsQ0FBQyxDQUFDK0ksRUFBRixDQUFLOUYsVUFBTCxJQUFtQixVQUFXSSxPQUFYLEVBQXFCO0FBQ3ZDLFdBQU8sS0FBS1osSUFBTCxDQUFVLFlBQVk7QUFDNUIsVUFBSyxDQUFFekMsQ0FBQyxDQUFDb0IsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZNkIsVUFBMUIsQ0FBUCxFQUFnRDtBQUMvQ2pELFFBQUFBLENBQUMsQ0FBQ29CLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWTZCLFVBQTFCLEVBQXNDLElBQUlFLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztBQUNBO0FBQ0QsS0FKTSxDQUFQO0FBS0EsR0FORDtBQVFBLENBNVZBLEVBNFZHUCxNQTVWSCxFQTRWV0MsTUE1VlgsRUE0Vm1CSCxRQTVWbkIiLCJmaWxlIjoibWlubnBvc3QtbWVtYmVyc2hpcC1mcm9udC1lbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdGlmICggMiA9PT0gcGVyZm9ybWFuY2UubmF2aWdhdGlvbi50eXBlICkge1xuXHRcdCAgIGxvY2F0aW9uLnJlbG9hZCggdHJ1ZSApO1xuXHRcdH1cblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciAkYnV0dG9uICA9ICQoIHRoaXMgKTtcblx0XHRcdHZhciAkc3RhdHVzICA9ICQoICcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciAkc2VsZWN0ICA9ICQoICdzZWxlY3QnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdGlmICggISAnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnICkge1xuXHRcdFx0XHQkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApLnJlbW92ZUNsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSBtLWJlbmVmaXQtbWVzc2FnZS1lcnJvciBtLWJlbmVmaXQtbWVzc2FnZS1pbmZvJyApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHQkYnV0dG9uLnRleHQoICdQcm9jZXNzaW5nJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIGRpc2FibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0dmFyIGRhdGEgPSB7fTtcblx0XHRcdHZhciBiZW5lZml0VHlwZSA9ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJyApLnZhbCgpO1xuXHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdCAgICBkYXRhID0ge1xuXHRcdFx0ICAgICAgICAnYWN0aW9uJyA6ICdiZW5lZml0X2Zvcm1fc3VibWl0Jyxcblx0XHRcdCAgICAgICAgJ21pbm5wb3N0X21lbWJlcnNoaXBfYmVuZWZpdF9mb3JtX25vbmNlJyA6ICRidXR0b24uZGF0YSggJ2JlbmVmaXQtbm9uY2UnICksXG5cdFx0XHQgICAgICAgICdjdXJyZW50X3VybCcgOiAkKCAnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHQgICAgICAgICdiZW5lZml0LW5hbWUnOiAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpLFxuXHRcdFx0ICAgICAgICAnaW5zdGFuY2VfaWQnIDogJCggJ1tuYW1lPVwiaW5zdGFuY2UtaWQtJyArICRidXR0b24udmFsKCkgKyAnXCJdJyApLnZhbCgpLFxuXHRcdFx0ICAgICAgICAncG9zdF9pZCcgOiAkYnV0dG9uLnZhbCgpLFxuXHRcdFx0ICAgICAgICAnaXNfYWpheCcgOiAnMScsXG5cdFx0XHQgICAgfTtcblxuXHRcdFx0ICAgICQucG9zdCggc2V0dGluZ3MuYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0ICAgIFx0Ly8gc3VjY2Vzc1xuXHRcdFx0XHQgICAgaWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHQgICAgXHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0ICAgIFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0ICAgIFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHQgICAgXHRpZiAoIDAgPCAkc2VsZWN0Lmxlbmd0aCApIHtcblx0XHRcdFx0ICAgIFx0XHQkc2VsZWN0LnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHQgICAgXHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubm90KCAkYnV0dG9uICkudmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLmF0dHIoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0ICAgIH0gZWxzZSB7XG5cdFx0XHRcdCAgICBcdC8vIGVycm9yXG5cdFx0XHRcdCAgICBcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHQgICAgXHRpZiAoICd1bmRlZmluZWQnID09PSB0eXBlb2YgcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0ICAgIFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0ICAgIFx0fSBlbHNlIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0XHQgICAgfSBlbHNlIHtcblx0XHRcdFx0ICAgIFx0XHQkKCAnb3B0aW9uJywgJHNlbGVjdCApLmVhY2goIGZ1bmN0aW9uKCBpICkge1xuXHRcdFx0XHQgICAgXHRcdFx0aWYgKCAkKCB0aGlzICkudmFsKCkgPT09IHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHQgICAgXHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdCAgICBcdFx0XHR9XG5cdFx0XHRcdCAgICBcdFx0fSk7XG5cdFx0XHRcdCAgICBcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0ICAgIFx0fSBlbHNlIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHQgICAgXHQvLyByZS1lbmFibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHRcdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubm90KCAkYnV0dG9uICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblx0XHRcdFx0ICAgIFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHQgICAgfVxuXG5cdFx0XHRcdH0pO1xuXHRcdCAgICB9XG5cdFx0fSk7XG5cdH1cblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0XHRpZiAoIDAgPCAkKCAnLm0tZm9ybS1tZW1iZXJzaGlwLWJlbmVmaXQnICkubGVuZ3RoICkge1xuXHRcdFx0YmVuZWZpdEZvcm0oKTtcblx0XHR9XG5cdH0pO1xuXG5cdCQoICcuYS1yZWZyZXNoLXBhZ2UnICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIHVuZGVmaW5lZCApIHtcblxuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RNZW1iZXJzaGlwJyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0J2RlYnVnJyA6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHQnYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJyNhbW91bnQtaXRlbSAjYW1vdW50Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJy5tLW1lbWJlcnNoaXAtZmFzdC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHQnbGV2ZWxfdmlld2VyX2NvbnRhaW5lcicgOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0J2xldmVsX25hbWUnIDogJy5hLWxldmVsJyxcblx0XHQndXNlcl9jdXJyZW50X2xldmVsJyA6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHQndXNlcl9uZXdfbGV2ZWwnIDogJy5hLW5ldy1sZXZlbCcsXG5cdFx0J2Ftb3VudF92aWV3ZXInIDogJy5hbW91bnQgaDMnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3NlbGVjdCcsXG5cdFx0J2xldmVsc19jb250YWluZXInIDogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0J3NpbmdsZV9sZXZlbF9jb250YWluZXInIDogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHQnc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3InIDogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0J2ZsaXBwZWRfaXRlbXMnIDogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdCdjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cblx0XHRpbml0OiBmdW5jdGlvbiggcmVzZXQsIGFtb3VudCApIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlciggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdWJtaXRGb3JtKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdH0sXG5cblx0XHRhbmFseXRpY3NFdmVudFRyYWNrOiBmdW5jdGlvbiggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NFdmVudFRyYWNrXG5cblx0XHRjYXRjaEhhc2hMaW5rczogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJChlLnRhcmdldCk7XG5cdFx0XHQgICAgaWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdCAgICB0YXJnZXQgPSB0YXJnZXQubGVuZ3RoID8gdGFyZ2V0IDogJCgnW25hbWU9JyArIHRoaXMuaGFzaC5zbGljZSgxKSArJ10nKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0JCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7XG5cdFx0XHRcdFx0XHRcdHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcFxuXHRcdFx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2F0Y2hMaW5rc1xuXG5cdFx0bGV2ZWxGbGlwcGVyOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBwcmV2aW91c19hbW91bnQgPSAnJztcblx0XHRcdHZhciBhbW91bnQgPSAwO1xuXHRcdFx0dmFyIGxldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gMDtcblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSAnJztcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRwcmV2aW91c19hbW91bnQgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXG5cdFx0XHQgICAgJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXG5cdFx0XHQgICAgXHRmcmVxdWVuY3lfc3RyaW5nID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmJpbmQoJ2tleXVwIG1vdXNldXAnLCBmdW5jdGlvbigpIHtcblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgICAgaWYoJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJykgIT0gJCh0aGlzKS52YWwoKSkge1xuXHRcdFx0ICAgICAgICAkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnLCAkKHRoaXMpLnZhbCgpKTtcblx0XHRcdCAgICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICAgIH07XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHQgICAgaWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblxuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cblx0XHRcdFx0XHRcdGlmICggZnJlcXVlbmN5ID09IDEgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LXllYXJseScgKSApO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5ID09IDEyICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC1tb250aGx5JyApICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblxuXHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpLnBhcmVudCgpICkudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBsZXZlbEZsaXBwZXJcblxuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdCAgdmFyIHRoaXN5ZWFyID0gcGFyc2VJbnQoIGFtb3VudCApICogcGFyc2VJbnQoIGZyZXF1ZW5jeSApO1xuXHRcdCAgdmFyIGxldmVsID0gJyc7XG5cdFx0ICBpZiAoIHR5cGVvZiBwcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnICYmIHByZXZpb3VzX2Ftb3VudCAhPT0gJycgKSB7XG5cdFx0ICAgIHZhciBwcmlvcl95ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQucHJpb3JfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgICAvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHQgICAgaWYgKCB0eXBlID09PSAnb25lLXRpbWUnICkge1xuXHRcdCAgICAgIHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9IGVsc2Uge1xuXHRcdCAgICAgIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9XG5cblx0XHQgICAgdGhpc3llYXIgPSBNYXRoLm1heCggcHJpb3JfeWVhcl9hbW91bnQsIGNvbWluZ195ZWFyX2Ftb3VudCwgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgIH1cblxuXHRcdCAgbGV2ZWwgPSB0aGlzLmdldExldmVsKCB0aGlzeWVhciApO1xuXG5cdFx0ICAkKCdoMicsIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCAgICBpZiAoICQodGhpcykudGV4dCgpID09IGxldmVsWyduYW1lJ10gKSB7XG5cdFx0ICAgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgICAkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICB9XG5cdFx0ICB9ICk7XG5cdFx0ICByZXR1cm4gbGV2ZWw7XG5cblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWw6IGZ1bmN0aW9uKCB0aGlzeWVhciApIHtcblx0XHRcdHZhciBsZXZlbCA9IFtdO1xuXHRcdFx0aWYgKCB0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAxO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodGhpc3llYXIgPiA1OSAmJiB0aGlzeWVhciA8IDEyMCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1NpbHZlcic7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDI7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMTE5ICYmIHRoaXN5ZWFyIDwgMjQwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnR29sZCc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDM7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnUGxhdGludW0nO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSA0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBnZXRMZXZlbFxuXG5cdFx0c2hvd05ld0xldmVsOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKSB7XG5cdFx0XHR2YXIgbWVtYmVyX2xldmVsX3ByZWZpeCA9ICcnO1xuXHRcdFx0dmFyIG9sZF9sZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdHZhciBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24oIHN0ciApIHtcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKCAvJiMoXFxkKyk7L2csIGZ1bmN0aW9uKCBtYXRjaCwgZGVjICkge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKCBkZWMgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHQkKG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikucHJvcCggJ2NsYXNzJywgJ2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApO1xuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMudXNlcl9jdXJyZW50X2xldmVsICkubGVuZ3RoID4gMCAmJiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdGlmICggJ2EnLCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKyAnIGEnO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0b2xkX2xldmVsID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwucmVwbGFjZSggbWVtYmVyX2xldmVsX3ByZWZpeCwgJycgKTtcblxuXHRcdFx0XHRpZiAoIG9sZF9sZXZlbCAhPT0gbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICkge1xuXHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdub3QtY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0JChvcHRpb25zLmxldmVsX25hbWUsIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikudGV4dCggbGV2ZWxbJ25hbWUnXSApO1xuXG5cdFx0fSwgLy8gZW5kIHNob3dOZXdMZXZlbFxuXG5cdFx0Y2hhbmdlRnJlcXVlbmN5OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHQgICAgdmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0ICAgIHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3kgICAgICA9IHBhcnNlSW50KCBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0gKTtcblxuXHRcdFx0ICAgICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnZhbCggc2VsZWN0ZWQgKTtcbiAgICBcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5wcm9wKCAnc2VsZWN0ZWQnLCBzZWxlY3RlZCApO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkuZGF0YSggJ2ZyZXF1ZW5jeScsIGZyZXF1ZW5jeSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldzogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljazogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGxldmVsX2NsYXNzID0gJCggdGhpcyApLnByb3AoICdjbGFzcycgKTtcblx0XHRcdFx0dmFyIGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtMV07XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciwgZWxlbWVudCApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciArICcgJyArIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHQgIH0pO1xuXHRcdH0sIC8vIGVuZCBzdGFydExldmVsQ2xpY2tcblxuXHRcdHN1Ym1pdEZvcm06IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0JCggZWxlbWVudCApLnN1Ym1pdCggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHR0aGF0LmFuYWx5dGljc0V2ZW50VHJhY2soICdldmVudCcsICdTdXBwb3J0IFVzJywgJ0JlY29tZSBBIE1lbWJlcicsIGxvY2F0aW9uLnBhdGhuYW1lICk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3VibWl0Rm9ybVxuXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiJdfQ==

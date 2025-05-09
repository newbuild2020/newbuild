@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        try:
            # 获取当前用户信息（这里假设使用session存储当前用户信息）
            current_user = session.get('username', 'システム')  # 默认值为'システム'
            
            # 创建新的Worker实例
            worker = Worker(
                name=request.form['name'],
                name_kana=request.form['name_kana'],
                name_romaji=request.form['name_romaji'],
                birth_date=datetime.strptime(request.form['birth_date'], '%Y-%m-%d').date(),
                age=calculate_age(datetime.strptime(request.form['birth_date'], '%Y-%m-%d').date()),
                gender=request.form['gender'],
                nationality=request.form['nationality'],
                visa_type=request.form['visa_type'],
                visa_expiry=datetime.strptime(request.form['visa_expiry'], '%Y-%m-%d').date(),
                passport_number=request.form['passport_number'],
                passport_expiry=datetime.strptime(request.form['passport_expiry'], '%Y-%m-%d').date(),
                phone=request.form['phone'],
                email=request.form['email'],
                postal_code=request.form['postal_code'],
                address=request.form['address'],
                address_kana=request.form['address_kana'],
                building_name=request.form['building_name'],
                building_name_kana=request.form['building_name_kana'],
                cho_me=request.form['cho_me'],
                emergency_name=request.form['emergency_name'],
                emergency_relationship=request.form['emergency_relationship'],
                emergency_phone=request.form['emergency_phone'],
                emergency_postal_code=request.form['emergency_postal_code'],
                emergency_address=request.form['emergency_address'],
                emergency_address_kana=request.form['emergency_address_kana'],
                emergency_building_name=request.form['emergency_building_name'],
                emergency_building_name_kana=request.form['emergency_building_name_kana'],
                emergency_cho_me=request.form['emergency_cho_me'],
                job_type=request.form['job_type'],
                experience_years=int(request.form['experience_years']),
                experience_months=int(request.form['experience_months']),
                japanese_level=request.form['japanese_level'],
                health_check_date=datetime.strptime(request.form['health_check_date'], '%Y-%m-%d').date(),
                health_check_expiry=datetime.strptime(request.form['health_check_expiry'], '%Y-%m-%d').date(),
                accident_insurance_expiry=datetime.strptime(request.form['accident_insurance_expiry'], '%Y-%m-%d').date(),
                employment_insurance_expiry=datetime.strptime(request.form['employment_insurance_expiry'], '%Y-%m-%d').date(),
                # 添加注册信息
                registration_date=datetime.utcnow(),
                registered_by=current_user,
                last_modified_date=datetime.utcnow(),
                modified_by=current_user
            )
            
            db.session.add(worker)
            db.session.commit()
            flash('登録が完了しました。', 'success')
            return redirect(url_for('index'))
        except Exception as e:
            db.session.rollback()
            flash(f'登録中にエラーが発生しました: {str(e)}', 'error')
            return redirect(url_for('register'))
    
    return render_template('register.html')

@app.route('/edit/<int:id>', methods=['GET', 'POST'])
def edit(id):
    worker = Worker.query.get_or_404(id)
    if request.method == 'POST':
        try:
            # 获取当前用户信息
            current_user = session.get('username', 'システム')
            
            # 更新基本信息
            worker.name = request.form['name']
            worker.name_kana = request.form['name_kana']
            worker.name_romaji = request.form['name_romaji']
            worker.birth_date = datetime.strptime(request.form['birth_date'], '%Y-%m-%d').date()
            worker.age = calculate_age(datetime.strptime(request.form['birth_date'], '%Y-%m-%d').date())
            worker.gender = request.form['gender']
            worker.nationality = request.form['nationality']
            worker.visa_type = request.form['visa_type']
            worker.visa_expiry = datetime.strptime(request.form['visa_expiry'], '%Y-%m-%d').date()
            worker.passport_number = request.form['passport_number']
            worker.passport_expiry = datetime.strptime(request.form['passport_expiry'], '%Y-%m-%d').date()
            worker.phone = request.form['phone']
            worker.email = request.form['email']
            
            # 更新住所信息
            worker.postal_code = request.form['postal_code']
            worker.address = request.form['address']
            worker.address_kana = request.form['address_kana']
            worker.building_name = request.form['building_name']
            worker.building_name_kana = request.form['building_name_kana']
            worker.cho_me = request.form['cho_me']
            
            # 更新紧急联系人信息
            worker.emergency_name = request.form['emergency_name']
            worker.emergency_relationship = request.form['emergency_relationship']
            worker.emergency_phone = request.form['emergency_phone']
            worker.emergency_postal_code = request.form['emergency_postal_code']
            worker.emergency_address = request.form['emergency_address']
            worker.emergency_address_kana = request.form['emergency_address_kana']
            worker.emergency_building_name = request.form['emergency_building_name']
            worker.emergency_building_name_kana = request.form['emergency_building_name_kana']
            worker.emergency_cho_me = request.form['emergency_cho_me']
            
            # 更新职种和经验信息
            worker.job_type = request.form['job_type']
            worker.experience_years = int(request.form['experience_years'])
            worker.experience_months = int(request.form['experience_months'])
            worker.japanese_level = request.form['japanese_level']
            
            # 更新保险和健康信息
            worker.health_check_date = datetime.strptime(request.form['health_check_date'], '%Y-%m-%d').date()
            worker.health_check_expiry = datetime.strptime(request.form['health_check_expiry'], '%Y-%m-%d').date()
            worker.accident_insurance_expiry = datetime.strptime(request.form['accident_insurance_expiry'], '%Y-%m-%d').date()
            worker.employment_insurance_expiry = datetime.strptime(request.form['employment_insurance_expiry'], '%Y-%m-%d').date()
            
            # 更新修改信息
            worker.last_modified_date = datetime.utcnow()
            worker.modified_by = current_user
            
            db.session.commit()
            flash('更新が完了しました。', 'success')
            return redirect(url_for('index'))
        except Exception as e:
            db.session.rollback()
            flash(f'更新中にエラーが発生しました: {str(e)}', 'error')
            return redirect(url_for('edit', id=id))
    
    return render_template('edit.html', worker=worker) 
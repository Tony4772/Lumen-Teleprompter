package pe.ebyzom.lumen.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow
import pe.ebyzom.lumen.model.Script

@Dao
interface ScriptDao {
    @Query("SELECT * FROM scripts ORDER BY updatedAt DESC")
    fun getAllScripts(): Flow<List<Script>>

    @Query("SELECT * FROM scripts WHERE id = :id")
    suspend fun getScriptById(id: Long): Script?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScript(script: Script)

    @Update
    suspend fun updateScript(script: Script)

    @Delete
    suspend fun deleteScript(script: Script)
}
